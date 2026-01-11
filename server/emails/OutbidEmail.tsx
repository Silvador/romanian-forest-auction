import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';

interface OutbidEmailProps {
  userName: string;
  auctionTitle: string;
  yourBid: number;
  newHighBid: number;
  auctionUrl: string;
}

export const OutbidEmail = ({
  userName = 'Utilizator',
  auctionTitle = 'Parcela forestieră',
  yourBid = 50000,
  newHighBid = 55000,
  auctionUrl = 'https://roforest.ro',
}: OutbidEmailProps) => {
  const difference = newHighBid - yourBid;
  const formattedYourBid = yourBid.toLocaleString('ro-RO');
  const formattedNewBid = newHighBid.toLocaleString('ro-RO');
  const formattedDifference = difference.toLocaleString('ro-RO');

  return (
    <Html>
      <Head />
      <Preview>Ai fost depășit la licitația pentru {auctionTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logoText}>🌲 RoForest</Heading>
            <Text style={tagline}>Licitații Forestiere</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>Ai fost depășit! 📢</Heading>

            <Text style={text}>
              Bună ziua <strong>{userName}</strong>,
            </Text>

            <Text style={text}>
              Din păcate, oferta ta pentru licitația <strong>{auctionTitle}</strong> a fost depășită de un alt participant.
            </Text>

            {/* Bid Comparison Box */}
            <Section style={bidBox}>
              <table style={bidTable}>
                <tr>
                  <td style={bidLabelCell}>
                    <Text style={bidLabel}>Oferta ta:</Text>
                  </td>
                  <td style={bidValueCell}>
                    <Text style={bidValue}>{formattedYourBid} RON</Text>
                  </td>
                </tr>
                <tr>
                  <td style={bidLabelCell}>
                    <Text style={bidLabel}>Oferta curentă:</Text>
                  </td>
                  <td style={bidValueCell}>
                    <Text style={bidValueHighlight}>{formattedNewBid} RON</Text>
                  </td>
                </tr>
                <tr>
                  <td style={bidLabelCell}>
                    <Text style={bidLabel}>Diferență:</Text>
                  </td>
                  <td style={bidValueCell}>
                    <Text style={bidDifference}>+{formattedDifference} RON</Text>
                  </td>
                </tr>
              </table>
            </Section>

            <Text style={text}>
              Dacă dorești să rămâi în competiție, poți plasa o nouă ofertă mai mare acum.
            </Text>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={auctionUrl}>
                Vezi licitația și licitează din nou
              </Button>
            </Section>

            <Text style={note}>
              💡 <strong>Sfat:</strong> Folosește funcția de "Licitare Automată" pentru a plasa automat oferte în numele tău până la o limită maximă stabilită de tine.
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Ai primit acest email deoarece participi la o licitație pe RoForest.ro
            </Text>
            <Text style={footerText}>
              <a href="https://roforest.ro/settings/notifications" style={link}>
                Gestionează preferințele de notificări
              </a>
            </Text>
            <Text style={footerCopyright}>
              © {new Date().getFullYear()} RoForest. Toate drepturile rezervate.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default OutbidEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 48px 24px',
  textAlign: 'center' as const,
  backgroundColor: '#0f4c2d',
};

const logoText = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
};

const tagline = {
  color: '#a8d5ba',
  fontSize: '14px',
  margin: '8px 0 0',
  padding: '0',
};

const content = {
  padding: '0 48px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '32px 0 24px',
  padding: '0',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const bidBox = {
  backgroundColor: '#fef3c7',
  border: '2px solid #fbbf24',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const bidTable = {
  width: '100%',
};

const bidLabelCell = {
  padding: '8px 0',
};

const bidValueCell = {
  padding: '8px 0',
  textAlign: 'right' as const,
};

const bidLabel = {
  color: '#78350f',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const bidValue = {
  color: '#78350f',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
};

const bidValueHighlight = {
  color: '#dc2626',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0',
};

const bidDifference = {
  color: '#059669',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
};

const note = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #bae6fd',
  borderRadius: '8px',
  padding: '16px',
  fontSize: '14px',
  color: '#075985',
  margin: '24px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#0f4c2d',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  cursor: 'pointer',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const footer = {
  padding: '0 48px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '8px 0',
};

const footerCopyright = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '16px 0 0',
};

const link = {
  color: '#0f4c2d',
  textDecoration: 'underline',
};
