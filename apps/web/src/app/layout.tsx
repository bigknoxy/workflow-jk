import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import Navbar from "@/lib/components/Navbar";

export const metadata = {
  title: "Workflow JK - Multi-Agent Software Delivery",
  description: "Supervised multi-agent software delivery platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main style={{ maxWidth: "960px", margin: "0 auto", padding: "1.5rem" }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}