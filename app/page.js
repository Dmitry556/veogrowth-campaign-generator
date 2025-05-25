export default function Home() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>VeoGrowth Campaign Generator</h1>
      <p>Loading the campaign generator...</p>
      <script dangerouslySetInnerHTML={{ __html: `
        window.location.href = '/campaign-generator';
      ` }} />
    </div>
  )
}
