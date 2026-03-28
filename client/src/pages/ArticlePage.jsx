import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { blogAPI } from '@/api/services';
import { format } from 'date-fns';
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;


export default function ArticlePage() {
  const { slug } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => blogAPI.getBySlug(slug).then(r => r.data.data),
  });

  if (isLoading) return <div className="container-app section"><div className="skeleton h-96 rounded-2xl"/></div>;
  if (!data?.article) return <div className="container-app section text-center"><p className="text-neutral-500">Article not found.</p></div>;

  const { article, related } = data;
  return (
    <div className="section">
      <div className="container-app">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-8">
            <Link to="/" className="hover:text-primary-600">Home</Link><span>/</span>
            <Link to="/blog" className="hover:text-primary-600">Blog</Link><span>/</span>
            <span className="text-neutral-800 line-clamp-1">{article.title}</span>
          </nav>

          <span className="badge-green capitalize mb-4 inline-flex">{article.category?.replace('-',' ')}</span>
          <h1 className="font-display text-4xl font-bold text-neutral-900 mb-4 leading-tight">{article.title}</h1>
          <p className="text-lg text-neutral-600 mb-6">{article.summary}</p>
          <div className="flex items-center gap-4 text-sm text-neutral-500 mb-8 pb-8 border-b border-neutral-200">
            <span>By {article.author?.name}</span>
            <span>•</span>
            <span>{article.readTimeMinutes} min read</span>
            <span>•</span>
            <span>{article.views} views</span>
            {article.publishedAt && <><span>•</span><span>{format(new Date(article.publishedAt), 'dd MMM yyyy')}</span></>}
          </div>
{/* test */}
          {article.image && <img  src={`${URL_IMAGE}/api/images/${article.image}`} alt={article.title} className="w-full rounded-2xl mb-8 aspect-video object-cover"/>}

          <div className="prose prose-neutral max-w-none">
            <div className="whitespace-pre-wrap text-neutral-700 leading-relaxed text-base">{article.content}</div>
          </div>

          {article.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-neutral-200">
              {article.tags.map(tag => <span key={tag} className="badge-gray text-xs"># {tag}</span>)}
            </div>
          )}
        </div>

        {related?.length > 0 && (
          <div className="max-w-3xl mx-auto mt-16">
            <h2 className="font-display text-2xl font-semibold mb-6">Related Articles</h2>
            <div className="grid sm:grid-cols-3 gap-5">
              {related.map(a => (
                <Link key={a._id} to={`/blog/${a.slug}`} className="card-hover group p-4">
                  <h3 className="font-semibold text-sm text-neutral-800 line-clamp-2 group-hover:text-primary-700 transition-colors">{a.title}</h3>
                  <p className="text-xs text-neutral-400 mt-2">{a.readTimeMinutes} min read</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
