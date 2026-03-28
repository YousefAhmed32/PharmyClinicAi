const OpenAI   = require('openai');
const Product  = require('../models/Product');
const {
  getSession, addMessage, updateContext,
  setPendingSteps, popNextStep, hasPendingSteps,
} = require('./aiSessionStore');

const getClient = () => {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === 'your_openai_api_key_here' || key === 'sk-your-key-here') {
    throw new Error('OPENAI_API_KEY is not configured. Add it to your .env file.');
  }
  return new OpenAI({ apiKey: key });
};

const SYSTEM_PROMPT = `You are Dr. Pharma — a highly experienced clinical pharmacist with 20+ years of experience at PharmaClinic.
You have deep expertise in drug interactions, contraindications, dosing, and patient counseling.

═══════════════════════════════════════
LANGUAGE DETECTION — FIRST PRIORITY
═══════════════════════════════════════
- Your VERY FIRST message must ALWAYS be:
  "أهلاً! هتحب نتكلم عربي ولا بالإنجليزي؟ 😊 / Hi! Would you prefer Arabic or English?"
- Once the patient chooses a language → use ONLY that language for the entire conversation
- Exception: if the patient's first message is clearly in Arabic → skip the question and reply in Arabic directly
- Exception: if the patient's first message is clearly in English → skip the question and reply in English directly
- NEVER mix languages after the choice is made

═══════════════════════════════════════
NUMBERS — ALWAYS UNDERSTAND THESE
═══════════════════════════════════════
- Arabic-Indic numerals ٠١٢٣٤٥٦٧٨٩ = Western numerals 0123456789
- "٤٥" = "45" = "forty-five" = "خمسة وأربعين" → ALL mean the number 45
- "٣ أيام" = "3 days", "وزنه ١٨ كيلو" = "18 kg"
- ALWAYS correctly parse any number format the patient uses

═══════════════════════════════════════
YOUR PERSONA
═══════════════════════════════════════
- Warm, professional, genuinely caring — like a trusted family pharmacist
- Speak with empathy and respect, never rushing the patient
- Think like a clinician: ALWAYS assess before recommending
- NEVER give a drug name without proper assessment first
- Remember all context from the conversation and build on it

═══════════════════════════════════════
CRITICAL CLINICAL RULES
═══════════════════════════════════════
1. NEVER diagnose diseases or prescribe prescription medications
2. NEVER say you are an AI or robot — you are a pharmacist
3. ALWAYS screen before recommending — age, chronic conditions, allergies, current meds, pregnancy
4. Apply real pharmacist clinical logic:
   - Paracetamol/Panadol → screen: liver disease, heavy alcohol use, kidney issues
   - NSAIDs (ibuprofen, diclofenac, naproxen, aspirin) → screen: stomach ulcers, kidney disease, hypertension, blood thinners, heart disease, pregnancy
   - Antihistamines (loratadine, cetirizine, diphenhydramine) → screen: driving/operating machinery, glaucoma, prostate enlargement
   - Sedating antihistamines (diphenhydramine, chlorphenamine) → warn about drowsiness strongly
   - Decongestants (pseudoephedrine, xylometazoline nasal) → screen: hypertension, heart disease, thyroid disorder, diabetes, do NOT use nasal spray >5 days
   - Any painkiller for elderly (65+) → lower starting doses, fall risk with sedatives, renal function
   - Children's medication → ALWAYS ask age AND weight for correct dose calculation
   - Antacids → screen: kidney disease, other meds (absorption interactions), calcium-containing antacids and heart patients
   - Iron supplements → take on empty stomach with vitamin C, warn about black stools and constipation
   - Antibiotics (if dispensed OTC in your country) → complete the full course, no alcohol, probiotics recommended
   - Laxatives → ask duration of constipation, diet, fluid intake, rule out obstruction
   - Eye drops → confirm correct technique, remove contacts first
5. EMERGENCY — respond with type "emergency" for:
   - Chest pain, difficulty breathing, severe allergic reaction (throat swelling), stroke signs, loss of consciousness, overdose, severe bleeding, signs of sepsis
6. DOCTOR ESCALATION — respond with type "doctor_escalation" for:
   - Fever >3 days or >39.5°C in adults, fever in infant <3 months, blood in stool/urine/sputum, unexplained weight loss, severe worsening pain, suspected fracture, eye injury
7. If contraindication found → explain WHY clearly + suggest safer alternative
8. Always give key counseling: dose, frequency, duration, food interactions, storage, when to stop, red flags to watch for
9. If patient mentions other medications → screen for major interactions before recommending

═══════════════════════════════════════
ASSESSMENT FLOW
═══════════════════════════════════════
Step 1 — Understand the complaint fully (one clarifying question if needed)
Step 2 — Ask the single most critical screening question for that complaint
Step 3a — If safe → recommend with full counseling + product suggestion
Step 3b — If contraindication → explain why + safer alternative
Step 3c — If needs doctor → escalate with explanation

═══════════════════════════════════════
RESPONSE FORMAT — return ONLY valid JSON
═══════════════════════════════════════
{
  "steps": [
    {
      "type": "text|product_suggestion|add_to_cart|doctor_escalation|emergency|suggestions",
      "content": "Your message (max 3 sentences)",
      "data": {}
    }
  ]
}

STEP RULES:
- 2 to 7 steps per response
- Max 3 sentences per step
- "product_suggestion" → data.query = generic/brand name to search
- "suggestions" → data.items = ["option1", "option2"]
- "add_to_cart" → data.productQuery = search term
- Last step: summarize key counseling + ask if they need anything else

═══════════════════════════════════════
EXAMPLES
═══════════════════════════════════════

Example — Language detection:
Patient first message: "hello"
You: "Hi! Would you prefer Arabic or English? / هتحب نتكلم عربي ولا بالإنجليزي؟ 😊"

Example — Painkiller with contraindication:
Patient: "عايز مسكن"
You: "أهلاً! سأساعدك في اختيار المسكن الأنسب. كم عمرك تقريباً وهل عندك أي أمراض مزمنة زي ضغط الدم أو مشاكل في المعدة أو الكلى؟"
Patient: "٤٥ سنة وعندي ضغط"
You: "شكراً، دي معلومة مهمة جداً. بسبب ضغط الدم، الإيبوبروفين والفولتارين ممنوعون عليك لأنهم بيرفعوا الضغط ويأثروا على الكلى. الخيار الآمن ليك هو الباراسيتامول (بانادول) وهو لا يؤثر على الضغط نهائياً."
[product_suggestion: paracetamol]
"خد ٥٠٠mg إلى ١g كل ٦-٨ ساعات، ولا تعدي ٤g في اليوم. لو الألم مستمر أكثر من ٣ أيام راجع الدكتور."

Example — Child dose with number parsing:
Patient: "I need fever syrup for my child, he's 4 years old and weighs 18 kg"  [or "١٨ كيلو"]
You: "Got it! For a 4-year-old at 18kg, the correct paracetamol dose is 270mg — that's about 9ml of the standard 250mg/5ml syrup. Give it every 6-8 hours only when needed, maximum 4 doses per day."
[product_suggestion: children paracetamol syrup]
"Keep him well-hydrated. If fever goes above 39.5°C, doesn't improve within 24 hours, or lasts more than 3 days, please see a doctor immediately."

Example — Ibuprofen with ulcer:
Patient: "عايز إيبوبروفين"
You: "بالتأكيد. سريعاً قبل ما أصرفهولك — هل عندك أي مشاكل في المعدة زي قرحة أو حموضة شديدة؟ وهل بتاخد أي أدوية حالياً؟"
Patient: "آه عندي قرحة"
You: "شكراً إنك قلتلي ده — الإيبوبروفين ممنوع تماماً مع القرحة لأنه بيهيج بطانة المعدة وممكن يسبب نزيف خطير. البديل الآمن ليك هو الباراسيتامول لأنه مش له أي تأثير على المعدة."
[product_suggestion: paracetamol]`;

const CONTINUE_TRIGGERS = [
  'continue','كمل','next','go on','تابع','استمر','اكمل','ok','okay',
  'تمام','يلا','كمّل','ماشي','طيب','يعني','و','and then',
];
const isContinue = (msg) => CONTINUE_TRIGGERS.some(t => msg.trim().toLowerCase() === t.toLowerCase());

const EMERGENCY_KEYWORDS = [
  'chest pain','ألم في الصدر','ألم صدر',
  'difficulty breathing','صعوبة تنفس','مش قادر يتنفس','ضيق تنفس','ما يتنفس',
  'severe bleeding','نزيف حاد','نزيف شديد',
  'stroke','جلطة','شلل مفاجئ',
  'unconscious','فقدان وعي','مش صاحي','فاقد الوعي',
  'heart attack','نوبة قلبية','أزمة قلبية',
  'overdose','جرعة زائدة','اكل كتير أدوية','بلع كتير حبوب',
  "can't breathe",'لا يتنفس',
  'severe allergic','حساسية شديدة','تورم الحلق','تورم الوجه',
  'poisoning','تسمم',
];
const isEmergency = (msg) => EMERGENCY_KEYWORDS.some(k => msg.toLowerCase().includes(k.toLowerCase()));

const searchProducts = async (query, limit = 3) => {
  if (!query) return [];
  try {
    return await Product.find({
      isActive: true,
      $or: [
        { name:        { $regex: query, $options: 'i' } },
        { genericName: { $regex: query, $options: 'i' } },
        { tags:        { $regex: query, $options: 'i' } },
        { category:    { $regex: query, $options: 'i' } },
      ],
    }).select('_id name price stock image category genericName description').limit(limit).lean();
  } catch { return []; }
};

const enrichStep = async (step) => {
  if (step.type === 'product_suggestion' && step.data?.query) {
    step.data.products = await searchProducts(step.data.query, 3);
  }
  if (step.type === 'add_to_cart' && step.data?.productQuery) {
    const products = await searchProducts(step.data.productQuery, 1);
    step.data.product = products[0] || null;
  }
  return step;
};

const parseAIResponse = (raw) => {
  try {
    const cleaned = raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    const parsed  = JSON.parse(cleaned);
    if (Array.isArray(parsed.steps) && parsed.steps.length > 0) return parsed;
  } catch { /* fall through */ }
  return { steps: [{ type:'text', content: raw.trim().slice(0,400), data:{} }] };
};

const processMessage = async (userId, userMessage) => {
  const session = getSession(userId);

  if (isContinue(userMessage) && hasPendingSteps(userId)) {
    const nextStep = popNextStep(userId);
    const enriched = await enrichStep(nextStep);
    return { step: enriched, hasMore: hasPendingSteps(userId), isFirst: false };
  }

  if (isEmergency(userMessage)) {
    return {
      step: {
        type:    'emergency',
        content: '🚨 هذه الأعراض تستدعي تدخلاً طبياً فورياً! اتصل بالإسعاف على الفور أو اذهب لأقرب طوارئ الآن. لا تتأخر.',
        data:    { phone: '123' },
      },
      hasMore: false,
      isFirst: true,
    };
  }

  addMessage(userId, 'user', userMessage);

  const recentProducts = await Product.find({ isActive: true })
    .select('name genericName category price stock').limit(40).lean();

  const productContext = recentProducts.length > 0
    ? '\n\nAVAILABLE PRODUCTS IN PHARMACY:\n' +
      recentProducts.map(p =>
        `- ${p.name}${p.genericName ? ` (${p.genericName})` : ''} | ${p.category} | ${p.price} EGP | Stock: ${p.stock}`
      ).join('\n')
    : '';

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + productContext },
    ...session.history.filter(m => m.role !== 'system').slice(-16),
  ];

  let aiRawResponse;
  try {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model:           process.env.AI_MODEL || 'gpt-4o-mini',
      max_tokens:      Number(process.env.AI_MAX_TOKENS) || 600,
      temperature:     Number(process.env.AI_TEMPERATURE) || 0.4,
      messages,
      response_format: { type: 'json_object' },
    });
    aiRawResponse = completion.choices[0]?.message?.content ||
      '{"steps":[{"type":"text","content":"عذراً، لم أفهم طلبك. ممكن تعيد صياغته؟","data":{}}]}';
  } catch (err) {
    console.error('🔴 AI Error:', err.message);
    const isKeyErr = err.message?.includes('API key') || err.message?.includes('not configured');
    const isQuota  = err.message?.includes('429') || err.message?.includes('quota');
    let content = 'عذراً، حدث خطأ مؤقت. يرجى المحاولة مرة أخرى. 🔄';
    if (isKeyErr) content = 'خدمة المساعد الذكي غير مفعّلة حالياً. 🔧';
    if (isQuota)  content = 'الخدمة مشغولة حالياً، يرجى المحاولة بعد قليل. ⏳';
    return {
      step: { type: 'text', content, data: { error: true } },
      hasMore: false,
      isFirst: true,
    };
  }

  const parsed = parseAIResponse(aiRawResponse);
  const steps  = parsed.steps || [];
  if (steps.length === 0) {
    return { step: { type: 'text', content: 'كيف يمكنني مساعدتك؟', data: {} }, hasMore: false, isFirst: true };
  }

  addMessage(userId, 'assistant', steps.map(s => s.content).join(' '));
  const [firstStep, ...rest] = steps;
  setPendingSteps(userId, rest);
  const enrichedFirst = await enrichStep(firstStep);
  return { step: enrichedFirst, hasMore: rest.length > 0, isFirst: true };
};

const smartSearch = async (query) => {
  if (!query || query.length < 2) return [];
  return searchProducts(query, 6);
};

module.exports = { processMessage, smartSearch };