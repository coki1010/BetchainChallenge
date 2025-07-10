export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { name, email, message } = req.body;

    // Ovdje možeš dodati integraciju s Email API-jem (npr. SendGrid, Resend, Nodemailer itd.)
    console.log('Poruka primljena:', { name, email, message });

    res.status(200).json({ success: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
