import './globals.css'

export const metadata = {
  title: 'VeoGrowth - AI-Powered B2B Lead Generation',
  description: 'Generate hyper-personalized cold email campaigns in 20 seconds',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
