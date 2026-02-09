# Contact form SMTP config

Endpoint: `POST /public/contact`

Payload fields:

- nome
- email
- telefone
- empresa
- segmento
- website (optional)
- desafio

Required environment variables for the marketing contact form endpoint:

- CONTACT_SMTP_HOST=smtp.hostinger.com
- CONTACT_SMTP_PORT=465
- CONTACT_SMTP_USER=contato@goldpdv.com.br
- CONTACT_SMTP_PASS=your_smtp_password
- CONTACT_SMTP_SECURE=true
- CONTACT_SMTP_TLS=true
- CONTACT_MAIL_FROM=contato@goldpdv.com.br
- CONTACT_MAIL_TO=karlouchoa@gmail.com

The email "From" name is set from the payload field `nome`.
