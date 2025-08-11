import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Header from "@/components/header"
import Sidebar from "@/components/sidebar"
import Footer from "@/components/footer"
import { AuthProvider } from "@/components/auth-provider.mock";
import "./globals.css"

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
})
const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
})

export const metadata: Metadata = {
    title: "DoctorForms | Only Expert Matters",
    description: "Smart forms for Doctors",
}

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className="h-full">
        <body
            className={[
                geistSans.variable,
                geistMono.variable,
                // shadcn/tailwind theme tokens (from your globals.css)
                "min-h-screen bg-background text-foreground antialiased",
            ].join(" ")}
        >
          
        {/*<AuthProvider>*/}
        {/*    <Header />*/}
        {/*    {children}*/}
        {/*</AuthProvider>*/}
        
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex flex-1 flex-col">
                <Header />
                <main className="flex-1 p-4">{children}</main>
                <Footer />
            </div>
        </div>
        </body>
        </html>
    )
}
