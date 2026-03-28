import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { blogAPI } from '@/api/services';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/useCommon';
import { BlogGridSkeleton } from '@/components/ui/Skeletons';
import { SearchInput, Pagination, EmptyState } from '@/components/ui/UIComponents';

const CATS = [
  { value:'',             label:'All Articles' },
  { value:'health-tips',  label:'Health Tips' },
  { value:'medications',  label:'Medications' },
  { value:'nutrition',    label:'Nutrition' },
  { value:'diseases',     label:'Diseases' },
  { value:'wellness',     label:'Wellness' },
  { value:'news',         label:'News' },
  { value:'other',        label:'Other' },
];

export default function BlogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput]   = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);

  const category = searchParams.get('category') || '';
  const page     = Number(searchParams.get('page') || 1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['blog-public', page, category, debouncedSearch],
    queryFn:  () => blogAPI.getAll({
      page, limit: 9,
      ...(category        && { category }),
      ...(debouncedSearch && { search: debouncedSearch }),
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const articles = data?.data || [];
  const meta     = data?.meta || {};

  const setCategory = (cat) => {
    const p = new URLSearchParams();
    if (cat) p.set('category', cat);
    setSearchParams(p);
  };

  return (
    <div className="section">
      <div className="container-app">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="section-title">Health Blog</h1>
          <p className="section-subtitle mx-auto max-w-xl">
            Expert health tips, medication guides, and wellness advice from our pharmacists
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search articles…"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {CATS.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border
                ${category === c.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300 hover:text-primary-700'
                }`}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Articles grid */}
        <div className={`transition-opacity ${isFetching && !isLoading ? 'opacity-70' : ''}`}>
          {isLoading ? (
            <BlogGridSkeleton count={9}/>
          ) : articles.length === 0 ? (
            <EmptyState
              icon="📰"
              title="No articles found"
              description="Try different keywords or browse all categories"
              action={{ label: 'Browse All', onClick: () => { setSearchInput(''); setSearchParams({}); }, variant: 'secondary' }}
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map(article => (
                <Link key={article._id} to={`/blog/${article.slug}`} className="card-hover group flex flex-col">
                  <div className="aspect-video bg-neutral-100 overflow-hidden">
                    {article.image
                      ? <img src={article.image} alt={article.title} loading="lazy"
                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                      : <div className="w-full h-full flex items-center justify-center text-4xl bg-primary-50">📰</div>
                    }
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <span className="badge-green text-xs mb-3 inline-flex capitalize">
                      {article.category?.replace('-', ' ')}
                    </span>
                    <h2 className="font-display font-semibold text-neutral-800 line-clamp-2 mb-2 flex-1
                                   group-hover:text-primary-700 transition-colors">
                      {article.title}
                    </h2>
                    <p className="text-sm text-neutral-500 line-clamp-2 mb-4">{article.summary}</p>
                    <div className="flex items-center justify-between text-xs text-neutral-400 mt-auto pt-3
                                    border-t border-neutral-100">
                      <span>By {article.author?.name}</span>
                      <div className="flex items-center gap-2">
                        <span>👁️ {article.views}</span>
                        <span>·</span>
                        <span>{article.readTimeMinutes} min</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="mt-10">
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={meta.limit}
              onChange={p => {
                const params = new URLSearchParams(searchParams);
                params.set('page', p);
                setSearchParams(params);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
