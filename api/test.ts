export default function handler(request: any, response: any) {
  response.status(200).json({ message: 'Hello from Vercel Function!' });
}
