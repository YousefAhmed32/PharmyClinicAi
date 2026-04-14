import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDebouncedCallback } from '@/hooks/useCommon';
import { blogAPI } from '@/api/services';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;

const CATS = ["health-tips","medications","nutrition","diseases","wellness","news","other"];
const EMPTY = { title:"", summary:"", content:"", category:"health-tips", tags:"", status:"draft" };

function ArticleModal({ editing, showModal, onClose, onSave, isSaving }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState("basic");

  useEffect(() => {
    if (!showModal) return;
    if (editing) {
      setForm({
        title: editing.title || "",
        summary: editing.summary || "",
        content: editing.content || "",
        category: editing.category || "health-tips",
        tags: Array.isArray(editing.tags) ? editing.tags.join(", ") : editing.tags || "",
        status: editing.status || "draft",
      });
      setPreview(editing.image || null);
    } else {
      setForm(EMPTY);
      setPreview(null);
      setImageFile(null);
    }
    setErrors({});
    setTab("basic");
  }, [editing, showModal]);

  const validate = () => {
    const e = {};
    if ((form.title || "").trim().length < 5) e.title = t('admin.titleMin');
    if (!(form.summary || "").trim() || form.summary.length < 10) e.summary = t('admin.summaryMin');
    if (!(form.content || "").trim() || form.content.length < 50) e.content = t('admin.contentMin');
    if (!form.category) e.category = t('common.required');
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); setTab(errs.content ? "content" : "basic"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k === "tags") {
        const tagsArray = (v || "").split(",").map(t => t.trim()).filter(Boolean);
        fd.append("tags", JSON.stringify(tagsArray));
      } else if (v !== "") { fd.append(k, v); }
    });
    if (imageFile) fd.append("image", imageFile);
    onSave(fd);
  };

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));
  const safeContent = form.content || "";
  const wordCount = safeContent.trim() ? safeContent.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="overlay" onClick={onClose}/>
      <div className="relative z-50 bg-white rounded-2xl shadow-lifted w-full max-w-2xl max-h-[92vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 shrink-0">
          <h2 className="font-display font-semibold text-lg">{editing ? t('admin.editArticle') : t('admin.newArticle')}</h2>
          <button onClick={onClose} className="btn-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div className="flex border-b border-neutral-100 px-5 shrink-0">
          {[[" basic", t('admin.basicInfo')],["content", t('admin.content')]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id.trim())}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${tab===id.trim()?"border-primary-600 text-primary-700":"border-transparent text-neutral-500 hover:text-neutral-700"}`}>
              {label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            {tab === "basic" && (
              <>
                <div>
                  <label className="label">{t('admin.coverImage')}</label>
                  <div className="flex items-start gap-4">
                    <div className="w-32 h-20 rounded-xl bg-neutral-100 overflow-hidden flex items-center justify-center border-2 border-dashed border-neutral-200 shrink-0">
                      {preview ? <img  src={`${URL_IMAGE}/api/images/${preview}`} alt="" className="w-full h-full object-cover"/> : <span className="text-2xl">🖼️</span>}
                    </div>
                    <div>
                      <input type="file" accept="image/*" onChange={e => { const file=e.target.files[0]; if(file){setImageFile(file);setPreview(URL.createObjectURL(file));} }}
                        className="text-sm text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-700"/>
                      <p className="text-xs text-neutral-400 mt-1">{t('admin.imageRecommended')}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="label">{t('admin.articleTitle')} *</label>
                  <input className={`input ${errors.title?"input-error":""}`} value={form.title} onChange={f("title")} placeholder="Article headline…"/>
                  {errors.title && <p className="error-text">{errors.title}</p>}
                </div>
                <div>
                  <label className="label">{t('admin.summaryLabel')} * <span className="text-neutral-400 font-normal text-xs">{t('admin.summaryHint')}</span></label>
                  <textarea className={`input ${errors.summary?"input-error":""}`} rows={2} value={form.summary} onChange={f("summary")} placeholder="Brief description…"/>
                  {errors.summary && <p className="error-text">{errors.summary}</p>}
                  <p className="text-xs text-neutral-400 mt-1">{(form.summary||"").length}/500</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('admin.categoryLabel')} *</label>
                    <select className={`input ${errors.category?"input-error":""}`} value={form.category} onChange={f("category")}>
                      {CATS.map(c => <option key={c} value={c}>{t(`blog.categories.${c}`) || c.replace("-"," ")}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('admin.statusLabel')}</label>
                    <select className="input" value={form.status} onChange={f("status")}>
                      <option value="draft">{t('admin.draft')}</option>
                      <option value="published">{t('admin.published')}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">{t('admin.tagsLabel')} <span className="text-neutral-400 font-normal text-xs">{t('admin.tagsHint')}</span></label>
                  <input className="input" value={form.tags} onChange={f("tags")} placeholder={t('admin.tagsPlaceholder')}/>
                </div>
              </>
            )}
            {tab === "content" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">{t('admin.contentLabel')} *</label>
                  <span className="text-xs text-neutral-400">{t('admin.wordCount', { count: wordCount, min: readTime })}</span>
                </div>
                <textarea className={`input font-mono text-sm leading-relaxed ${errors.content?"input-error":""}`} rows={18}
                  value={form.content} onChange={f("content")} placeholder="Write your article here…"/>
                {errors.content && <p className="error-text">{errors.content}</p>}
                <p className="text-xs text-neutral-400 mt-1.5">{t('admin.contentTip')}</p>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center px-5 py-4 border-t border-neutral-100 bg-neutral-50 rounded-b-2xl shrink-0">
            <div className="flex gap-2">
              {tab==="content" && <button type="button" onClick={() => setTab("basic")} className="btn-ghost btn-sm">← {t('admin.basicInfo')}</button>}
              {tab==="basic"   && <button type="button" onClick={() => setTab("content")} className="btn-secondary btn-sm">{t('admin.content')} →</button>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost btn-sm">{t('common.cancel')}</button>
              <button type="submit" disabled={isSaving} className="btn-primary min-w-[110px]">
                {isSaving ? t('admin.saving') : form.status==="published" ? t('admin.publish') : t('admin.saveDraft')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminBlogPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [page,      setPage]      = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [filters,   setFilters]   = useState({ search:"", category:"", status:"" });
  const [searchVal, setSearchVal] = useState("");

  const debouncedSearch = useDebouncedCallback((val) => {
    setPage(1); setFilters(f => ({ ...f, search: val }));
  }, 400);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-blog", page, filters],
    queryFn: () => blogAPI.getAdminAll({ page, limit:10, ...(filters.search&&{search:filters.search}), ...(filters.category&&{category:filters.category}), ...(filters.status&&{status:filters.status}) }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: statsData } = useQuery({
    queryKey: ["admin-blog-stats"],
    queryFn: () => blogAPI.getStats().then(r => r.data.data),
  });

  const save = useMutation({
    mutationFn: (fd) => editing ? blogAPI.update(editing._id, fd) : blogAPI.create(fd),
    onSuccess: () => { toast.success(editing ? t('common.success') : t('common.success')); qc.invalidateQueries(["admin-blog"]); qc.invalidateQueries(["admin-blog-stats"]); closeModal(); },
    onError: (err) => toast.error(err.response?.data?.message || t('errors.unknown')),
  });

  const remove = useMutation({
    mutationFn: (id) => blogAPI.delete(id),
    onSuccess: () => { toast.success(t('common.success')); qc.invalidateQueries(["admin-blog"]); },
    onError: (err) => toast.error(err.response?.data?.message || t('errors.unknown')),
  });

  const togglePublish = useMutation({
    mutationFn: (a) => a.status==="published" ? blogAPI.unpublish(a._id) : blogAPI.publish(a._id),
    onSuccess: () => { toast.success(t('common.success')); qc.invalidateQueries(["admin-blog"]); },
    onError: (err) => toast.error(err.response?.data?.message || t('errors.unknown')),
  });

  const openCreate = () => { setEditing(null); setShowModal(true); };
  const openEdit = async (a) => {
    try {
      const res = await blogAPI.getById(a._id);
      setEditing(res.data.data || res.data);
      setShowModal(true);
    } catch { toast.error(t('errors.unknown')); }
  };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const articles   = data?.data || [];
  const meta       = data?.meta || {};
  const stats      = statsData;
  const hasFilters = filters.search || filters.category || filters.status;
  const resetFilters = () => { setFilters({search:"",category:"",status:""}); setSearchVal(""); setPage(1); };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">{t('admin.blog')}</h1>
          <p className="text-neutral-500 text-sm mt-0.5">{meta.total||0} {t('admin.totalArticles')}</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {t('admin.newArticle')}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: t('common.all'),        val: stats.total,                    icon:"📝", color:"bg-neutral-50" },
            { label: t('admin.published'),   val: stats.byStatus?.published || 0, icon:"🌐", color:"bg-primary-50" },
            { label: t('admin.drafts'),      val: stats.byStatus?.draft     || 0, icon:"📋", color:"bg-yellow-50" },
            { label: t('admin.topViews'),    val: stats.topViewed?.[0]?.views||0, icon:"👁️", color:"bg-blue-50" },
          ].map(({label,val,icon,color})=>(
            <div key={label} className={`card p-3 flex items-center gap-3 ${color}`}>
              <span className="text-lg">{icon}</span>
              <div><p className="font-bold text-neutral-900 text-sm">{val??"—"}</p><p className="text-xs text-neutral-500">{label}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 mb-5 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="input pl-9 text-sm" placeholder={t('blog.searchPlaceholder')} value={searchVal} onChange={e=>{setSearchVal(e.target.value);debouncedSearch(e.target.value);}}/>
          </div>
          <select className="input w-auto text-sm" value={filters.category} onChange={e=>{setPage(1);setFilters(f=>({...f,category:e.target.value}));}}>
            <option value="">{t('common.all')}</option>
            {CATS.map(c=><option key={c} value={c}>{t(`blog.categories.${c}`) || c.replace("-"," ")}</option>)}
          </select>
          <select className="input w-auto text-sm" value={filters.status} onChange={e=>{setPage(1);setFilters(f=>({...f,status:e.target.value}));}}>
            <option value="">{t('admin.allStatus')}</option>
            <option value="published">{t('admin.published')}</option>
            <option value="draft">{t('admin.draft')}</option>
          </select>
          {hasFilters && <button onClick={resetFilters} className="btn-ghost btn-sm text-red-500">✕ {t('common.cancel')}</button>}
        </div>
        {hasFilters && (
          <div className="flex flex-wrap gap-2">
            {filters.search   && <span className="badge-blue text-xs">"{filters.search}"</span>}
            {filters.category && <span className="badge-gray text-xs capitalize">{t(`blog.categories.${filters.category}`) || filters.category.replace("-"," ")}</span>}
            {filters.status   && <span className={filters.status==="published"?"badge-green text-xs":"badge-yellow text-xs"}>{filters.status==="published"?t('admin.published'):t('admin.draft')}</span>}
          </div>
        )}
      </div>

      <div className={`card transition-opacity ${isFetching?"opacity-70":""}`}>
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(6)].map((_,i)=><div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
        ) : articles.length===0 ? (
          <div className="p-16 text-center">
            <p className="text-4xl mb-3">📝</p>
            <p className="font-semibold text-neutral-700">{t('admin.noArticles')}</p>
            {hasFilters ? <button onClick={resetFilters} className="btn-secondary mt-4">{t('admin.clearFilters')}</button> : <button onClick={openCreate} className="btn-primary mt-4">{t('admin.writeFirst')}</button>}
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('blog.title')}</th>
                  <th>{t('admin.categoryLabel')}</th>
                  <th>{t('admin.author')}</th>
                  <th>{t('admin.views')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('admin.publishedDate')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {articles.map(a => (
                  <tr key={a._id}>
                    <td>
                      <div className="flex items-center gap-3 max-w-[260px]">
                        <div className="w-12 h-9 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                          {a.image ? <img  src={`${URL_IMAGE}/api/images/${a.image}`} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-lg">📰</div>}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-neutral-800 line-clamp-1">{a.title}</p>
                          <p className="text-xs text-neutral-400 line-clamp-1">{a.summary}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge-gray text-xs capitalize">{t(`blog.categories.${a.category}`) || a.category?.replace("-"," ")}</span></td>
                    <td className="text-sm text-neutral-600">{a.author?.name}</td>
                    <td><span className="text-sm font-medium text-neutral-700">👁️ {a.views}</span></td>
                    <td>
                      <button onClick={() => togglePublish.mutate(a)}
                        className={`badge cursor-pointer transition-colors hover:opacity-80 ${a.status==="published"?"badge-green":"badge-yellow"}`}>
                        {a.status==="published" ? t('admin.published') : t('admin.draft')}
                      </button>
                    </td>
                    <td className="text-xs text-neutral-500">{a.publishedAt ? format(new Date(a.publishedAt),"dd MMM yyyy") : "—"}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(a)} className="btn-ghost btn-sm text-blue-600">{t('common.edit')}</button>
                        <button onClick={() => { if(window.confirm(`Delete "${a.title}"?`)) remove.mutate(a._id); }} className="btn-ghost btn-sm text-red-500 hover:bg-red-50">{t('common.delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">{(meta.page-1)*meta.limit+1}–{Math.min(meta.page*meta.limit,meta.total)} of {meta.total}</p>
            <div className="flex gap-1">
              <button disabled={meta.page<=1} onClick={()=>setPage(p=>p-1)} className="btn-ghost btn-sm disabled:opacity-40">← {t('common.previous')}</button>
              {[...Array(Math.min(meta.totalPages,7))].map((_,i)=>(
                <button key={i+1} onClick={()=>setPage(i+1)} className={`w-8 h-8 rounded-lg text-sm ${meta.page===i+1?"bg-primary-600 text-white":"hover:bg-neutral-100"}`}>{i+1}</button>
              ))}
              <button disabled={meta.page>=meta.totalPages} onClick={()=>setPage(p=>p+1)} className="btn-ghost btn-sm disabled:opacity-40">{t('common.next')} →</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <ArticleModal editing={editing} showModal={showModal} onClose={closeModal} onSave={fd => save.mutate(fd)} isSaving={save.isPending}/>
      )}
    </div>
  );
}