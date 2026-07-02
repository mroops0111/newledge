import Link from 'next/link';

const features = [
  {
    title: '追蹤管理',
    description: '設定和管理您的知識追蹤項目，包含領域、關鍵字、來源和頻率等設定。',
    icon: '📊',
    href: '/tracks',
    color: 'from-blue-500 to-blue-600',
    stats: '追蹤管理',
  },
  {
    title: 'AI 驅動搜尋',
    description: '基於您的追蹤設定，AI 自動搜尋相關內容並進行智能分析。',
    icon: '🤖',
    href: '/tracks',
    color: 'from-indigo-500 to-indigo-600',
    stats: '智能搜尋',
  },
  {
    title: '內容摘要',
    description: 'AI 技術自動生成內容摘要，幫助您快速掌握核心資訊。',
    icon: '📝',
    href: '/tracks',
    color: 'from-purple-500 to-purple-600',
    stats: '智能摘要',
  },
  {
    title: '即時通知',
    description: '根據設定的頻率，自動推送最新的相關內容到您的通知管道。',
    icon: '🔔',
    href: '/tracks',
    color: 'from-green-500 to-green-600',
    stats: '即時通知',
  },
];

const stats = [
  { name: '內容來源', value: '多元化', description: '新聞、部落格、深度文章' },
  { name: 'AI 準確度', value: '95%', description: '智能內容篩選與摘要' },
  { name: '更新頻率', value: '即時', description: '24/7 持續追蹤' },
];

export default function Home() {
  return (
    <div className="page-container">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className="animate-slide-up">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Newledge
                </span>
              </h1>
              <p className="text-2xl text-gray-700 mb-6 max-w-4xl mx-auto font-medium">
                Your Stream of Fresh Knowledge, Powered by AI Search & Smart Summaries
              </p>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                AI 驅動的智能資訊追蹤、搜尋與自動摘要平台。透過個人化設定，
                從新聞、部落格和深度文章中即時捕獲高價值知識。
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-slide-up">
              <Link
                href="/tracks"
                className="btn-secondary text-lg px-8 py-4"
              >
                了解更多
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 animate-slide-up">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-lg font-medium text-gray-900 mb-1">
                    {stat.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {stat.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-2000"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              核心功能
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              透過 AI 技術與智能自動化，提供高效率的知識獲取與學習體驗
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Link
                key={index}
                href={feature.href}
                className="group card card-body hover:scale-105 transition-all duration-300 relative overflow-hidden"
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center text-white text-2xl shadow-lg`}>
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {feature.title}
                      </h3>
                      <span className="badge badge-blue">
                        {feature.stats}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {feature.description}
                    </p>
                    <div className="flex items-center text-blue-600 font-medium group-hover:translate-x-2 transition-transform">
                      開始使用
                      <svg
                        className="w-4 h-4 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity rounded-xl`}></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="card card-body bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <h2 className="text-3xl font-bold mb-4">
              立即開始您的智能知識追蹤之旅
            </h2>
            <p className="text-xl mb-8 opacity-90">
              透過 AI 驅動的個人化設定，讓高價值知識自動送到您面前
            </p>
            <Link
              href="/tracks"
              className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              免費開始使用
              <svg
                className="w-5 h-5 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
