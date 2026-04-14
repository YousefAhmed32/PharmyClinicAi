import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { productsAPI, blogAPI } from "@/api/services";
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE;

function HeroSection() {
  const { t } = useTranslation();
  const badges = [
    {
      label: t("home.badge1Title"),
      sub: t("home.badge1Sub"),
      pos: { top: "10%", right: "-5%" },
    },
    {
      label: t("home.badge2Title"),
      sub: t("home.badge2Sub"),
      pos: { bottom: "15%", right: "-8%" },
    },
    {
      label: t("home.badge3Title"),
      sub: t("home.badge3Sub"),
      pos: { top: "40%", left: "-10%" },
    },
  ];
  return (
    <section className="gradient-hero min-h-screen flex items-center overflow-hidden relative">
      <div className="container-app">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-slide-up">
            <span className="badge-green text-xs font-semibold tracking-wide uppercase mb-4 inline-flex">
              {t("home.trustedBadge")}
            </span>
            <h1 className="font-display text-4xl lg:text-6xl font-bold text-neutral-900 leading-tight mb-6">
              {t("home.heroTitle")}
              <br />
              <span className="text-primary-600">
                {t("home.heroTitleHighlight")}
              </span>
            </h1>
            <p className="text-neutral-600 text-lg leading-relaxed mb-8 max-w-lg">
              {t("home.heroDesc")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/store" className="btn-primary btn-lg">
                {t("common.shopNow")}
              </Link>
              <Link to="/booking" className="btn-secondary btn-lg">
                {t("common.bookConsultation")}
              </Link>
            </div>
            <div className="flex gap-8 mt-10">
              {[
                [t("home.stat1Value"), t("home.stat1Label")],
                [t("home.stat2Value"), t("home.stat2Label")],
                [t("home.stat3Value"), t("home.stat3Label")],
              ].map(([v, l]) => (
                <div key={l}>
                  <div className="font-display font-bold text-2xl text-primary-700">
                    {v}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:flex justify-center relative">
            <div className="w-80 h-80 rounded-full bg-primary-100 flex items-center justify-center relative">
              <div
                className="absolute inset-0 rounded-full border-2 border-primary-200 animate-spin-slow opacity-40"
                style={{ borderStyle: "dashed" }}
              />
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
                  fill="#339966"
                  fillOpacity="0.15"
                  stroke="#339966"
                  strokeWidth="1.5"
                />
                <path
                  d="M9 12h6M12 9v6"
                  stroke="#339966"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              {badges.map((item, i) => (
                <div
                  key={i}
                  className="absolute card px-3 py-2 shadow-lifted text-xs"
                  style={item.pos}
                >
                  <p className="font-semibold text-neutral-800">{item.label}</p>
                  <p className="text-neutral-500">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryCards() {
  const { t } = useTranslation();
  const cats = [
    {
      key: "vitamins",
      icon: "💊",
      color: "bg-blue-50 text-blue-600",
      q: "vitamins",
    },
    {
      key: "skincare",
      icon: "✨",
      color: "bg-pink-50 text-pink-600",
      q: "skincare",
    },
    {
      key: "supplements",
      icon: "🧪",
      color: "bg-purple-50 text-purple-600",
      q: "supplements",
    },
    {
      key: "babycare",
      icon: "👶",
      color: "bg-yellow-50 text-yellow-600",
      q: "babycare",
    },
    {
      key: "equipment",
      icon: "🩺",
      color: "bg-primary-50 text-primary-600",
      q: "equipment",
    },
    {
      key: "medicines",
      icon: "💉",
      color: "bg-red-50 text-red-600",
      q: "medicines",
    },
  ];
  return (
    <section className="section">
      <div className="container-app">
        <div className="text-center mb-12">
          <h2 className="section-title">{t("store.title")}</h2>
          <p className="section-subtitle mx-auto max-w-xl">
            {t("store.searchPlaceholder")}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {cats.map(({ key, icon, color, q }) => (
            <Link
              key={key}
              to={`/store?category=${q}`}
              className="card-hover p-5 text-center group cursor-pointer"
            >
              <div
                className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mx-auto mb-3 text-2xl group-hover:scale-110 transition-transform`}
              >
                {icon}
              </div>
              <p className="text-sm font-medium text-neutral-700">
                {t(`store.categories.${key}`)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedProducts() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => productsAPI.getFeatured(4).then((r) => r.data.data),
  });
  return (
    <section className="section bg-neutral-50/50">
      <div className="container-app">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="section-title">{t("home.featuredTitle")}</h2>
            <p className="section-subtitle mt-2">{t("home.featuredDesc")}</p>
          </div>
          <Link to="/store" className="btn-secondary hidden sm:inline-flex">
            {t("common.seeAll")}
          </Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-64 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {(data || []).map((product) => (
              <Link
                key={product._id}
                to={`/store/${product._id}`}
                className="card-hover group"
              >
                <div className="aspect-square bg-neutral-100 overflow-hidden">
                  {product.image ? (
                    <img
                      src={`${URL_IMAGE}/api/images/${product.image}`}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      💊
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-primary-600 font-medium uppercase tracking-wide mb-1">
                    {product.category}
                  </p>
                  <h3 className="font-semibold text-neutral-800 text-sm line-clamp-2 mb-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900">
                      {product.price} {t("common.currency")}
                    </span>
                    {product.stock > 0 ? (
                      <span className="badge-green text-xs">
                        {t("store.inStock")}
                      </span>
                    ) : (
                      <span className="badge-red text-xs">
                        {t("store.outOfStock")}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="text-center mt-8 sm:hidden">
          <Link to="/store" className="btn-secondary">
            {t("common.seeAll")}
          </Link>
        </div>
      </div>
    </section>
  );
}

function WhyUs() {
  const { t } = useTranslation();
  const features = [
    {
      icon: "🔬",
      titleKey: "home.feature1Title",
      descKey: "home.feature1Desc",
    },
    {
      icon: "🚚",
      titleKey: "home.feature3Title",
      descKey: "home.feature3Desc",
    },
    {
      icon: "👨‍⚕️",
      titleKey: "home.feature2Title",
      descKey: "home.feature2Desc",
    },
    {
      icon: "💬",
      titleKey: "home.feature4Title",
      descKey: "home.feature4Desc",
    },
  ];
  return (
    <section className="section">
      <div className="container-app">
        <div className="text-center mb-12">
          <h2 className="section-title">{t("home.whyTitle")}</h2>
          <p className="section-subtitle mx-auto max-w-xl">
            {t("home.whyDesc")}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon, titleKey, descKey }) => (
            <div
              key={titleKey}
              className="card p-6 hover:shadow-lifted transition-shadow"
            >
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="font-display font-semibold text-neutral-800 mb-2">
                {t(titleKey)}
              </h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                {t(descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LatestBlog() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["blog-home"],
    queryFn: () => blogAPI.getAll({ limit: 3 }).then((r) => r.data.data),
  });
  if (isLoading || !data?.length) return null;
  return (
    <section className="section bg-neutral-50/50">
      <div className="container-app">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="section-title">{t("home.blogTitle")}</h2>
            <p className="section-subtitle mt-2">{t("home.blogDesc")}</p>
          </div>
          <Link to="/blog" className="btn-secondary hidden sm:inline-flex">
            {t("common.seeAll")}
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((article) => (
            <Link
              key={article._id}
              to={`/blog/${article.slug}`}
              className="card-hover group"
            >
              <div className="aspect-video bg-neutral-100 overflow-hidden">
                {article.image ? (
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    📰
                  </div>
                )}
              </div>
              <div className="p-5">
                <span className="badge-green text-xs mb-3 inline-flex">
                  {article.category}
                </span>
                <h3 className="font-display font-semibold text-neutral-800 line-clamp-2 mb-2 group-hover:text-primary-700 transition-colors">
                  {article.title}
                </h3>
                <p className="text-sm text-neutral-500 line-clamp-2">
                  {article.summary}
                </p>
                <p className="text-xs text-neutral-400 mt-3">
                  {article.readTimeMinutes} {t("blog.minRead")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const { t } = useTranslation();
  return (
    <section className="section">
      <div className="container-app">
        <div className="gradient-primary rounded-3xl p-10 lg:p-16 text-center text-white relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative z-10">
            <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">
              {t("home.ctaTitle")}
            </h2>
            <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
              {t("home.ctaDesc")}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="bg-white text-primary-700 font-semibold px-8 py-3 rounded-xl hover:bg-primary-50 transition-colors"
              >
                {t("home.ctaBtn")}
              </Link>
              <Link
                to="/store"
                className="border border-white/40 text-white px-8 py-3 rounded-xl hover:bg-white/10 transition-colors"
              >
                {t("common.shopNow")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ServicesSection() {
  const { t } = useTranslation();
  const services = [
    {
      icon: "📋",
      titleKey: "prescription.title",
      descKey: "prescription.desc",
      link: "/prescription",
      ctaKey: "prescription.upload",
    },
    {
      icon: "⚗️",
      titleKey: "drugCheck.title",
      descKey: "drugCheck.desc",
      link: "/drug-interactions",
      ctaKey: "drugCheck.checkInteractions",
    },
    {
      icon: "📅",
      titleKey: "appointments.title",
      descKey: "appointments.selectType",
      link: "/booking",
      ctaKey: "appointments.book",
    },
    {
      icon: "💬",
      titleKey: "chat.title",
      descKey: "chat.startChat",
      link: "/chat",
      ctaKey: "chat.send",
    },
  ];
  return (
    <section className="section bg-neutral-50/50">
      <div className="container-app">
        <div className="text-center mb-12">
          <h2 className="section-title">
            {t("nav.chat")} & {t("nav.appointments")}
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map(({ icon, titleKey, descKey, link, ctaKey }) => (
            <div
              key={titleKey}
              className="card p-6 hover:shadow-lifted transition-shadow group"
            >
              <div className="text-4xl mb-4">{icon}</div>
              <h3 className="font-display font-semibold text-neutral-800 mb-2">
                {t(titleKey)}
              </h3>
              <p className="text-sm text-neutral-500 leading-relaxed mb-4">
                {t(descKey)}
              </p>
              <Link
                to={link}
                className="text-primary-600 text-sm font-semibold group-hover:underline"
              >
                {t(ctaKey)} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <CategoryCards />
      <FeaturedProducts />
      <WhyUs />
      <LatestBlog />
      <ServicesSection />
      <CTASection />
    </div>
  );
}
