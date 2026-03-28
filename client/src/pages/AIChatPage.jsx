import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/api/axios';
import useAuthStore from '@/store/authStore';
import useCartStore from '@/store/cartStore';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;


// ── Message type renderers ────────────────────────────────────────────────
function EmergencyCard() {
  return (
    <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-4 animate-scale-in">
      <div className="flex items-start gap-3">
        <span className="text-3xl">🚨</span>
        <div>
          <p className="font-bold text-red-700 text-base">حالة طوارئ!</p>
          <p className="text-red-600 text-sm mt-1">هذه الأعراض تستدعي تدخلاً طبياً فورياً.</p>
          <div className="flex gap-2 mt-3">
            <a href="tel:123" className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors">
              📞 اتصل بالإسعاف 123
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function DoctorEscalationCard() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 animate-scale-in">
      <div className="flex items-start gap-3">
        <span className="text-2xl">👨‍⚕️</span>
        <div>
          <p className="font-semibold text-blue-800">هذه الحالة تحتاج إلى استشارة طبيب.</p>
          <p className="text-blue-600 text-sm mt-1">يمكنك حجز موعد مع أطبائنا.</p>
          <Link to="/booking" className="inline-flex items-center gap-1 mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            📅 احجز موعد الآن
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, onAddToCart, adding }) {
  if (!product) return null;
  return (
    <div className="bg-white border border-primary-200 rounded-2xl p-4 shadow-sm animate-scale-in">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
          {product.image
            ? <img
            src={`${URL_IMAGE}/api/images/${product.image}`}
         className="w-full h-full object-cover"/>
            : <div className="w-full h-full flex items-center justify-center text-2xl">💊</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-neutral-800 text-sm truncate">{product.name}</p>
          {product.genericName && <p className="text-xs text-neutral-400">{product.genericName}</p>}
          <div className="flex items-center justify-between mt-2">
            <p className="font-bold text-primary-700">{product.price} EGP</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${product.stock > 0 ? 'bg-primary-50 text-primary-600' : 'bg-red-50 text-red-500'}`}>
              {product.stock > 0 ? `✓ ${product.stock} متاح` : 'نفد المخزون'}
            </span>
          </div>
        </div>
      </div>
      {product.stock > 0 && (
        <button onClick={() => onAddToCart(product)} disabled={adding}
          className="w-full mt-3 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
          {adding
            ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2"/><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg> جاري الإضافة…</>
            : '🛒 أضف إلى السلة'
          }
        </button>
      )}
    </div>
  );
}

function ProductSuggestionList({ products, onAddToCart, adding }) {
  if (!products?.length) return null;
  return (
    <div className="space-y-2 mt-2">
      {products.map(p => (
        <ProductCard key={p._id} product={p} onAddToCart={onAddToCart} adding={adding}/>
      ))}
    </div>
  );
}

function SuggestionChips({ items, onSelect }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map((item, i) => (
        <button key={i} onClick={() => onSelect(item)}
          className="px-3 py-1.5 bg-primary-50 border border-primary-200 text-primary-700 text-xs rounded-full hover:bg-primary-100 transition-colors">
          {item}
        </button>
      ))}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────
function MessageBubble({ msg, onAddToCart, addingId, onSuggestionSelect }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[75%] px-4 py-2.5 bg-primary-600 text-white rounded-2xl rounded-tr-sm text-sm leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  const { type, content, data } = msg.step || { type:'text', content: msg.content, data:{} };

  return (
    <div className="flex items-start gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center shrink-0 shadow-green">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white" fillOpacity="0.9">
          <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
        </svg>
      </div>
      <div className="flex-1 max-w-[80%]">
        <p className="text-xs text-neutral-400 mb-1 font-medium">مساعد الصيدلية</p>

        {type === 'emergency' && <EmergencyCard/>}

        {type === 'doctor_escalation' && (
          <>
            {content && <div className="px-4 py-2.5 bg-white border border-neutral-200 rounded-2xl rounded-tl-sm text-sm text-neutral-800 shadow-sm mb-2">{content}</div>}
            <DoctorEscalationCard/>
          </>
        )}

        {(type === 'text' || type === 'product_suggestion' || type === 'add_to_cart' || type === 'suggestions') && content && (
          <div className="px-4 py-2.5 bg-white border border-neutral-200 rounded-2xl rounded-tl-sm text-sm text-neutral-800 shadow-sm leading-relaxed">
            {content}
          </div>
        )}

        {type === 'product_suggestion' && data?.products?.length > 0 && (
          <ProductSuggestionList products={data.products} onAddToCart={onAddToCart} adding={addingId !== null}/>
        )}

        {type === 'suggestions' && data?.items?.length > 0 && (
          <SuggestionChips items={data.items} onSelect={onSuggestionSelect}/>
        )}

        {type === 'add_to_cart' && data?.product && (
          <ProductCard product={data.product} onAddToCart={onAddToCart} adding={addingId !== null}/>
        )}
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" fillOpacity="0.9">
          <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
        </svg>
      </div>
      <div className="px-4 py-3 bg-white border border-neutral-200 rounded-2xl rounded-tl-sm shadow-sm">
        <div className="flex gap-1.5 items-center">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}/>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Continue button ───────────────────────────────────────────────────────
function ContinueButton({ onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-200 text-primary-700 text-xs rounded-full hover:bg-primary-100 transition-colors disabled:opacity-50 mx-auto mt-1">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
      اضغط للمتابعة
    </button>
  );
}

// ── Quick prompts ─────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: '💊 ألم الرأس', text: 'عندي صداع شديد' },
  { label: '🤒 حمى', text: 'عندي حمى مع ارتفاع درجة الحرارة' },
  { label: '🛒 تسوق', text: 'أريد شراء فيتامينات' },
  { label: '⚠️ تفاعل دواء', text: 'أريد التحقق من تفاعل الأدوية' },
  { label: '👨‍⚕️ طبيب', text: 'أريد التحدث مع طبيب' },
];

// ── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function AIChatPage() {
  const { accessToken, user } = useAuthStore();
  const { fetchCart }         = useCartStore();
  const navigate              = useNavigate();

  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [typing,     setTyping]     = useState(false);
  const [hasMore,    setHasMore]    = useState(false);
  const [addingId,   setAddingId]   = useState(null);

  // ✅ ref للـ scroll container مش للعنصر
  const messagesScrollRef = useRef(null);
  const inputRef          = useRef(null);

  // ✅ الحل الصح — بيـscroll جوه الـ div بس مش الصفحة كلها
  const scrollToBottom = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  // Welcome message
  useEffect(() => {
    if (!accessToken) return;
    setMessages([{
      id:   'welcome',
      role: 'assistant',
      step: {
        type:    'text',
        content: `أهلاً ${user?.name?.split(' ')[0] || 'بك'} 😊 أنا مساعدك في صيدلية PharmaClinic. يمكنني مساعدتك في إيجاد الأدوية والمنتجات المناسبة لك. كيف يمكنني مساعدتك اليوم؟`,
        data:    {},
      },
    }]);
  }, [accessToken]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: (text) => api.post('/ai/chat', { message: text }),
    onSuccess: (res) => {
      const result = res.data.data;
      setTyping(false);
      setMessages(prev => [...prev, {
        id:   Date.now(),
        role: 'assistant',
        step: result.step,
      }]);
      setHasMore(result.hasMore);
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    onError: (err) => {
      setTyping(false);
      setMessages(prev => [...prev, {
        id:   Date.now(),
        role: 'assistant',
        step: { type:'text', content: err.response?.data?.message || 'حدث خطأ. يرجى المحاولة مرة أخرى.', data:{} },
      }]);
      setHasMore(false);
    },
  });

  const handleSend = useCallback((text) => {
    const msg = (text || input).trim();
    if (!msg || sendMessage.isPending) return;
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: msg }]);
    setInput('');
    setHasMore(false);
    setTyping(true);
    setTimeout(() => sendMessage.mutate(msg), 600);
  }, [input, sendMessage]);

  const handleContinue = useCallback(() => {
    handleSend('continue');
  }, [handleSend]);

  const handleAddToCart = useCallback(async (product) => {
    if (!product?._id) return;
    setAddingId(product._id);
    try {
      await api.post('/ai/add-to-cart', { productId: product._id, quantity: 1 });
      await fetchCart();
      toast.success(`✅ تم إضافة "${product.name}" للسلة`);
      setMessages(prev => [...prev, {
        id:   Date.now(),
        role: 'assistant',
        step: { type:'text', content:`تم إضافة "${product.name}" لسلة التسوق بنجاح! 🛒 هل تحتاج شيئاً آخر؟`, data:{} },
      }]);
    } catch {
      toast.error('فشل إضافة المنتج. يرجى المحاولة مرة أخرى.');
    } finally {
      setAddingId(null);
    }
  }, [fetchCart]);

  const handleClearChat = async () => {
    try {
      await api.delete('/ai/session');
      setMessages([{
        id:   'welcome-new',
        role: 'assistant',
        step: { type:'text', content:'تم بدء محادثة جديدة! 😊 كيف يمكنني مساعدتك؟', data:{} },
      }]);
      setHasMore(false);
      toast.success('تم مسح المحادثة');
    } catch { toast.error('فشل المسح'); }
  };

  if (!accessToken) {
    return (
      <div className="section container-app max-w-md text-center">
        <div className="card p-12">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="font-display font-semibold text-xl mb-3">تسجيل الدخول مطلوب</h2>
          <p className="text-neutral-500 mb-6">سجّل الدخول لاستخدام المساعد الذكي</p>
          <button onClick={() => navigate('/login')} className="btn-primary">تسجيل الدخول</button>
        </div>
      </div>
    );
  }

  // ✅ الصفحة بتاخد الـ height الكاملة من الـ main
  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="max-w-2xl w-full mx-auto flex flex-col h-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-600 flex items-center justify-center shadow-green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" fillOpacity="0.9">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
              </svg>
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-neutral-900">مساعد الصيدلية</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse-green"/>
                <span className="text-xs text-primary-600 font-medium">متاح الآن</span>
              </div>
            </div>
          </div>
          <button onClick={handleClearChat} className="btn-ghost btn-sm text-neutral-500 hover:text-red-500">
            🗑 مسح
          </button>
        </div>

        {/* ✅ Chat window — بياخد باقي الـ height */}
        <div className="card flex flex-col flex-1 overflow-hidden">

          {/* ✅ Messages — overflow-y-auto هنا بس */}
          <div
            ref={messagesScrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-1 bg-neutral-50/30"
          >
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onAddToCart={handleAddToCart}
                addingId={addingId}
                onSuggestionSelect={(text) => handleSend(text)}
              />
            ))}

            {typing && <TypingIndicator/>}

            {hasMore && !typing && !sendMessage.isPending && (
              <ContinueButton onClick={handleContinue} disabled={sendMessage.isPending}/>
            )}
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div className="px-4 py-3 border-t border-neutral-100 bg-white shrink-0">
              <p className="text-xs text-neutral-400 mb-2">اقتراحات سريعة:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map(p => (
                  <button key={p.text} onClick={() => handleSend(p.text)}
                    className="px-3 py-1.5 bg-neutral-100 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200
                               border border-neutral-200 text-neutral-600 text-xs rounded-full transition-all">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="px-4 py-3 border-t border-neutral-100 bg-white shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                className="input flex-1 resize-none text-sm py-2.5 leading-relaxed max-h-24"
                placeholder={hasMore ? 'اكتب "كمل" للمتابعة أو اسأل سؤالاً جديداً…' : 'اكتب سؤالك هنا…'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                dir="auto"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || sendMessage.isPending}
                className="btn-primary px-4 py-2.5 shrink-0 disabled:opacity-40">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1.5 text-center">
              Enter للإرسال · Shift+Enter لسطر جديد · اكتب "كمل" للمتابعة
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-neutral-400 text-center mt-2 shrink-0">
          ⚕️ هذا المساعد للإرشاد فقط ولا يُعد بديلاً عن الاستشارة الطبية المتخصصة.
        </p>
      </div>
    </div>
  );
}