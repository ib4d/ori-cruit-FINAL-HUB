console.log({
  geminiKey: process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 5)}...` : null,
  apiKey: process.env.API_KEY ? `${process.env.API_KEY.substring(0, 5)}...` : null,
  allKeys: Object.keys(process.env).filter(k => k.includes('KEY') || k.includes('GEMINI'))
});
