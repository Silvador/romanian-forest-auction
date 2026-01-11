import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';

interface WonAuctionEmailProps {
  userName: string;
  auctionTitle: string;
  winningBid: number;
  auctionUrl: string;
}

export const WonAuctionEmail = ({
  userName = 'Utilizator',
  auctionTitle = 'Parcela forestieră',
  winningBid = 75000,
  auctionUrl = 'https://roforest.ro',
}: WonAuctionEmailProps) => {
  const formattedBid = winningBid.toLocaleString('ro-RO');

  return (
    <Html>
      <Head />
      <Preview>Felicitări! Ai câștigat licitația pentru {auctionTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logoText}>🌲 RoForest</Heading>
            <Text style={tagline}>Licitații Forestiere</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <div style={celebrationEmoji}>🎉</div>
            <Heading style={h1}>Felicitări! Ai câștigat licitația!</Heading>

            <Text style={text}>
              Bună ziua <strong>{userName}</strong>,
            </Text>

            <Text style={text}>
              Avem vești excelente! Ai câștigat licitația pentru <strong>{auctionTitle}</strong>.
            </Text>

            {/* Winner Box */}
            <Section style={winnerBox}>
              <Text style={winnerLabel}>Oferta ta câștigătoare:</Text>
              <Text style={winnerAmount}>{formattedBid} RON</Text>
              <Text style={winnerBadge}>🏆 CÂȘTIGĂTOR</Text>
            </Section>

            <Heading style={h2}>Pașii următori</Heading>

            <Section style={stepsList}>
              <div style={step}>
                <Text style={stepNumber}>1</Text>
                <div>
                  <Text style={stepTitle}>Verifică detaliile licitației</Text>
                  <Text style={stepText}>
                    Accesează pagina licitației pentru a vedea toate informațiile despre parcela forestieră câștigată.
                  </Text>
                </div>
              </div>

              <div style={step}>
                <Text style={stepNumber}>2</Text>
                <div>
                  <Text style={stepTitle}>Contactează vânzătorul</Text>
                  <Text style={stepText}>
                    Vânzătorul va fi notificat automat. Veți primi detalii de contact pentru a finaliza tranzacția.
                  </Text>
                </div>
              </div>

              <div style={step}>
                <Text style={stepNumber}>3</Text>
                <div>
                  <Text style={stepTitle}>Finalizează plata</Text>
                  <Text style={stepText}>
                    Coordonează cu vânzătorul pentru finalizarea plății și transferul documentelor de proprietate.
                  </Text>
                </div>
              </div>
            </Section>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={auctionUrl}>
                Vezi detalii licitație
              </Button>
            </Section>

            <Section style={infoBox}>
              <Text style={infoTitle}>📋 Informații importante</Text>
              <Text style={infoText}>
                • Asigură-te că verifici documentele APV înainte de finalizarea tranzacției
              </Text>
              <Text style={infoText}>
                • Toate detaliile despre parcela (suprafață, specii, volum) sunt disponibile în documentul licitației
              </Text>
              <Text style={infoText}>
                • În caz de întrebări, poți contacta echipa noastră de suport
              </Text>
            </Section>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Ai primit acest email deoarece ai câștigat o licitație pe RoForest.ro
            </Text>
            <Text style={footerText}>
              <a href="https://roforest.ro/dashboard" style={link}>
                Accesează Dashboard-ul
              </a>
              {' • '}
              <a href="https://roforest.ro/support" style={link}>
                Suport
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

export default WonAuctionEmail;

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

const celebrationEmoji = {
  fontSize: '64px',
  textAlign: 'center' as const,
  margin: '24px 0 16px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '16px 0 24px',
  padding: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1f2937',
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '32px 0 16px',
  padding: '0',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const winnerBox = {
  backgroundColor: '#10b981',
  borderRadius: '12px',
  padding: '32px',
  margin: '32px 0',
  textAlign: 'center' as const,
};

const winnerLabel = {
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 8px',
};

const winnerAmount = {
  color: '#ffffff',
  fontSize: '36px',
  fontWeight: 'bold',
  margin: '8px 0',
};

const winnerBadge = {
  backgroundColor: '#ffffff',
  color: '#10b981',
  fontSize: '14px',
  fontWeight: 'bold',
  display: 'inline-block',
  padding: '8px 24px',
  borderRadius: '20px',
  margin: '16px 0 0',
};

const stepsList = {
  margin: '24px 0',
};

const step = {
  display: 'flex',
  gap: '16px',
  margin: '24px 0',
  alignItems: 'flex-start' as const,
};

const stepNumber = {
  backgroundColor: '#0f4c2d',
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: 'bold',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  margin: '0',
  padding: '0',
  lineHeight: '40px',
  textAlign: 'center' as const,
};

const stepTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const stepText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const infoBox = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #bae6fd',
  borderRadius: '8px',
  padding: '20px',
  margin: '32px 0',
};

const infoTitle = {
  color: '#075985',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const infoText = {
  color: '#075985',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
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
