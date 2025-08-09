import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});
const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "DoctorForms | Only Expert Matters",
    description: "Smart forms for Doctors",
};

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
        {children}
        </body>
        </html>
    );
}
