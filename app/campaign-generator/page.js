'use client';
import { useState } from 'react';

export default function CampaignGenerator() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [positioning, setPositioning] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/generate-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website, positioning })
      });
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      alert('Something went wrong!');
    }
    
    setLoading(false);
  };
  
  return (
    <div>
      <h1>VeoGrowth Campaign Generator</h1>
      <p>Coming soon! Basic structure in place.</p>
    </div>
  );
}
