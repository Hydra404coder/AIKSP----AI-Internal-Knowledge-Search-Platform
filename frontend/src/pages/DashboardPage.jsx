/**
 * =============================================================================
 * DASHBOARD PAGE - MAIN OVERVIEW AND STATS
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * The main dashboard that users see after logging in. It provides:
 * - Overview statistics (documents, searches, etc.)
 * - Quick action cards
 * - Recent activity
 * - Featured/recent documents
 * 
 * DATA FETCHING:
 * We use useEffect to fetch data when the component mounts.
 * This is the standard pattern for data loading in React.
 * 
 * =============================================================================
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Search,
  FileText,
  Upload,
  TrendingUp,
  Clock,
  Users,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Brain,
  BookOpen,
  Activity,
  MessageSquare,
  ChevronRight,
  RefreshCcw,
  Zap,
  FolderOpen,
  ArrowUpRight
} from 'lucide-react';

function DashboardPage() {
  const { user } = useAuth();

  // Dashboard data state
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalSearches: 0,
    totalQuestions: 0,
    recentDocuments: []
  });
  const [recentQueries, setRecentQueries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch dashboard data on component mount
   * 
   * useEffect with empty dependency array [] runs once when component mounts.
   * We fetch stats from the documents endpoint.
   */
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch document stats and organization stats
        const [statsResponse, orgResponse] = await Promise.all([
          api.get('/documents/stats'),
          api.get('/organizations/me')
        ]);

        // Only use real backend values, fallback to 0 if missing
        setStats({
          totalDocuments: statsResponse.data?.totalDocuments || 0,
          totalSearches: statsResponse.data?.totalSearches || 0,
          totalQuestions: statsResponse.data?.totalQuestions || 0,
          recentDocuments: statsResponse.data?.recentUploads || [],
          activeUsers: orgResponse.data?.stats?.userCount || 1
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        // Show 0 for all stats if API fails
        setStats({
          totalDocuments: 0,
          totalSearches: 0,
          totalQuestions: 0,
          recentDocuments: [],
          activeUsers: 1
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  /**
   * Greeting based on time of day
   */
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  /**
   * Stats cards configuration
   */
  const statCards = [
    {
      name: 'Total Documents',
      value: stats.totalDocuments,
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      link: '/documents',
      trend: '+12%',
      trendUp: true
    },
    {
      name: 'Searches Today',
      value: stats.totalSearches,
      icon: Search,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      link: '/search',
      trend: '+8%',
      trendUp: true
    },
    {
      name: 'AI Questions',
      value: stats.totalQuestions,
      icon: MessageSquare,
      color: 'from-violet-500 to-violet-600',
      bgColor: 'bg-violet-50',
      iconColor: 'text-violet-600',
      link: '/search',
      trend: '+24%',
      trendUp: true
    },
    {
      name: 'Active Users',
      value: stats.activeUsers || 1,
      icon: Users,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      link: '/admin',
      trend: '+2',
      trendUp: true
    }
  ];

  /**
   * Quick action cards configuration
   */
  const quickActions = [
    {
      title: 'Upload Documents',
      description: 'Add new documents to the knowledge base',
      icon: Upload,
      link: '/upload',
      color: 'from-blue-500 to-indigo-600',
      shadowColor: 'shadow-blue-500/25'
    },
    {
      title: 'Search Knowledge',
      description: 'Find information in your documents',
      icon: Search,
      link: '/search',
      color: 'from-emerald-500 to-teal-600',
      shadowColor: 'shadow-emerald-500/25'
    },
    {
      title: 'Ask AI',
      description: 'Get AI-powered answers with citations',
      icon: Brain,
      link: '/search?mode=ai',
      color: 'from-violet-500 to-purple-600',
      shadowColor: 'shadow-violet-500/25'
    },
    {
      title: 'View All Documents',
      description: 'Browse and manage your document library',
      icon: FolderOpen,
      link: '/documents',
      color: 'from-amber-500 to-orange-600',
      shadowColor: 'shadow-amber-500/25'
    }
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Page Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-2xl">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-gradient-to-br from-primary-500/20 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-48 w-48 rounded-full bg-gradient-to-tr from-violet-500/20 to-transparent blur-3xl" />
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm border border-white/10">
                <Sparkles className="h-3 w-3" />
                AI-Powered Platform
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              {getGreeting()}, {user?.firstName}!
            </h1>
            <p className="mt-2 text-base text-slate-300">
              Welcome back to your AI Knowledge Search dashboard
            </p>
          </div>
          <div className="mt-6 sm:mt-0 flex gap-3">
            <Link 
              to="/search" 
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-white/10 transition-all hover:bg-slate-100 hover:shadow-xl hover:scale-105"
            >
              <Search className="h-4 w-4" />
              Start Searching
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.name}
              to={stat.link}
              className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-200/60 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 hover:border-slate-300"
            >
              {/* Background Gradient on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`} />
              
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <div className={`inline-flex items-center justify-center rounded-xl ${stat.bgColor} p-3 transition-transform group-hover:scale-110`}>
                    <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-500">{stat.name}</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    {isLoading ? (
                      <div className="h-9 w-16 animate-pulse rounded-lg bg-slate-200" />
                    ) : (
                      <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                  <TrendingUp className="h-3 w-3" />
                  {stat.trend}
                </div>
              </div>
              
              {/* Arrow indicator */}
              <div className="absolute bottom-4 right-4 opacity-0 transform translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                <ArrowUpRight className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Quick Actions</h2>
            <p className="mt-1 text-sm text-slate-500">Get started with common tasks</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.link}
                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${action.color} p-6 text-white shadow-lg ${action.shadowColor} transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02]`}
              >
                {/* Shine Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                </div>
                
                {/* Icon Background */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                
                <div className="relative">
                  <div className="inline-flex items-center justify-center rounded-xl bg-white/20 p-3 backdrop-blur-sm mb-4 transition-transform group-hover:scale-110 group-hover:rotate-3">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  
                  <h3 className="text-lg font-bold text-white">
                    {action.title}
                  </h3>
                  <p className="mt-1 text-sm text-white/80">
                    {action.description}
                  </p>
                  
                  <div className="mt-4 flex items-center text-sm font-semibold text-white">
                    Get started
                    <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Two column layout for recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Searches */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/60">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5">
                <Clock className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Recent Searches</h2>
                <p className="text-sm text-slate-500">Your latest queries</p>
              </div>
            </div>
            <Link 
              to="/search" 
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-10 w-10 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
                    <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentQueries.length > 0 ? (
            <ul className="space-y-3">
              {recentQueries.map((query, index) => (
                <li key={index} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className={`rounded-xl p-2.5 ${query.type === 'question' ? 'bg-violet-100' : 'bg-blue-100'}`}>
                    {query.type === 'question' ? (
                      <HelpCircle className="h-4 w-4 text-violet-600" />
                    ) : (
                      <Search className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-primary-600 transition-colors">
                      {query.query}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(query.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-primary-600 transition-colors" />
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No recent searches</p>
              <p className="text-xs text-slate-400 mt-1">Your search history will appear here</p>
              <Link 
                to="/search" 
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <Zap className="h-4 w-4" />
                Start your first search
              </Link>
            </div>
          )}
        </div>

        {/* Recent Documents */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/60">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-2.5">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Recent Documents</h2>
                <p className="text-sm text-slate-500">Latest uploads</p>
              </div>
            </div>
            <Link 
              to="/documents" 
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-12 w-12 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
                    <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats.recentDocuments?.length > 0 ? (
            <ul className="space-y-3">
              {stats.recentDocuments.map((doc) => (
                <li key={doc._id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg shadow-blue-500/25">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-primary-600 transition-colors">
                      {doc.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-primary-600 transition-colors" />
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 mb-4">
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-sm font-medium text-slate-600">No documents yet</p>
              <p className="text-xs text-slate-400 mt-1">Upload your first document to get started</p>
              <Link 
                to="/upload" 
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <Upload className="h-4 w-4" />
                Upload your first document
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* AI Feature Highlight */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-8 text-white shadow-2xl shadow-purple-500/25">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse" />
          <div className="absolute top-1/4 right-1/4 h-48 w-48 rounded-full bg-white/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        {/* Floating Icon */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 opacity-10">
          <Brain className="h-64 w-64" />
        </div>
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm border border-white/20">
              <Sparkles className="h-4 w-4" />
              AI-Powered
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm border border-emerald-400/30 text-emerald-100">
              <Zap className="h-4 w-4" />
              Instant Answers
            </div>
          </div>
          
          <h2 className="text-3xl font-bold mb-3 tracking-tight">
            Ask Questions in Natural Language
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mb-8 leading-relaxed">
            Our AI understands your questions and finds accurate answers from your internal documents. 
            Get responses with citations pointing to the exact source.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Link 
              to="/search?mode=ai" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-violet-700 font-semibold rounded-xl shadow-lg shadow-black/10 hover:bg-slate-50 hover:shadow-xl hover:scale-105 transition-all"
            >
              <Brain className="h-5 w-5" />
              Try AI Search
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link 
              to="/documents" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-xl backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all"
            >
              <BookOpen className="h-5 w-5" />
              Browse Documents
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Stats Bar */}
      <div className="rounded-2xl bg-slate-900 p-6 text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-white">{stats.totalDocuments}</div>
            <div className="text-sm text-slate-400 mt-1">Documents Indexed</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-emerald-400">{stats.totalSearches}</div>
            <div className="text-sm text-slate-400 mt-1">Searches Today</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-violet-400">{stats.totalQuestions}</div>
            <div className="text-sm text-slate-400 mt-1">AI Questions</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-400">{stats.activeUsers || 1}</div>
            <div className="text-sm text-slate-400 mt-1">Active Users</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
