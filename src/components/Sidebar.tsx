import { NavLink } from 'react-router-dom';
import { 
  Database, 
  BarChart3, 
  Users, 
  User,
  Menu,
  X,
  Award,
  TrendingUp
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const navItems = [
  { path: '/data', label: '数据管理', icon: Database },
  { path: '/effective', label: '有效值分析', icon: TrendingUp },
  { path: '/ranking', label: '学生排名筛选', icon: Award },
  { path: '/overview', label: '成绩总体分析', icon: BarChart3 },
  { path: '/class', label: '成绩班级分析', icon: Users },
  { path: '/personal', label: '成绩个人分析', icon: User },
];

export function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-dark-surface border border-dark-border text-dark-text hover:bg-dark-surface2 transition-colors"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-50 lg:z-auto w-64 bg-dark-surface border-r border-dark-border transition-transform duration-300 ease-in-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-center border-b border-dark-border px-6">
            <h1 className="text-xl font-semibold text-dark-text">成绩分析系统</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer',
                      isActive
                        ? 'bg-dark-surface2 text-dark-text shadow-lg'
                        : 'text-dark-textSecondary hover:bg-dark-surface2 hover:text-dark-text'
                    )
                  }
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
