import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-dark-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto ">
        <div className="w-full mx-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
