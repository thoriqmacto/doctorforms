import Footer from '@/components/footer'
import Header from '@/components/header'
import Sidebar from '@/components/sidebar'
import { AuthProvider } from '@/components/auth-provider'
import RequireAuth from '@/components/auth/require-auth'
import { SidebarProvider } from '@/components/sidebar-provider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RequireAuth>
        <SidebarProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex flex-1 flex-col">
              <Header />
              <main className="flex-1 p-4">{children}</main>
              <Footer />
            </div>
          </div>
        </SidebarProvider>
      </RequireAuth>
    </AuthProvider>
  )
}
