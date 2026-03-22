import { createServer } from 'vite';
async function run() {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  console.log(process.env.GEMINI_API_KEY);
  process.exit(0);
}
run();
