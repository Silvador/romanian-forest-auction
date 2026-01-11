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

interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
}

export const WelcomeEmail = ({
  userName = 'Utilizator',
  userEmail = 'utilizator@example.com',
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Bun venit pe RoForest - Platforma de licitații forestiere din România</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logoText}>🌲 RoForest</Heading>
            <Text style={tagline}>Licitații Forestiere</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>Bun venit pe RoForest!</Heading>

            <Text style={text}>
              Bună ziua <strong>{userName}</strong>,
            </Text>

            <Text style={text}>
              Ne bucurăm că te-ai alăturat comunității RoForest, platforma modernă pentru licitații forestiere din România.
            </Text>

            <Text style={text}>
              Contul tău a fost creat cu succes și poți începe imediat să explorezi licitațiile active sau să publici propria ta licitație.
            </Text>

            {/* Features Box */}
            <Section style={featuresBox}>
              <Heading style={featuresTitle}>Ce poți face pe RoForest?</Heading>

              <div style={feature}>
                <Text style={featureIcon}>🌲</Text>
                <div>
                  <Text style={featureTitle}>Creează licitații</Text>
                  <Text style={featureText}>
                    Publică parcele forestiere pentru vânzare cu documente APV și fotografii.
                  </Text>
                </div>
              </div>

              <div style={feature}>
                <Text style={featureIcon}>💰</Text>
                <div>
                  <Text style={featureTitle}>Licitează inteligent</Text>
                  <Text style={featureText}>
                    Folosește licitarea automată pentru a economisi timp și a nu pierde oportunități.
                  </Text>
                </div>
              </div>

              <div style={feature}>
                <Text style={featureIcon}>📄</Text>
                <div>
                  <Text style={featureTitle}>Documente complete</Text>
                  <Text style={featureText}>
                    Vezi documentele APV, suprafețe, volum și specii pentru fiecare parcelă.
                  </Text>
                </div>
              </div>

              <div style={feature}>
                <Text style={featureIcon}>🔔</Text>
                <div>
                  <Text style={featureTitle}>Notificări instant</Text>
                  <Text style={featureText}>
                    Primește alertă când ești depășit sau când o licitație se apropie de final.
                  </Text>
                </div>
              </div>

              <div style={feature}>
                <Text style={featureIcon}>🔒</Text>
                <div>
                  <Text style={featureTitle}>Sigur și transparent</Text>
                  <Text style={featureText}>
                    Toate tranzacțiile sunt transparente și bazate pe documente oficiale APV.
                  </Text>
                </div>
              </div>
            </Section>

            {/* CTA Buttons */}
            <Section style={buttonContainer}>
              <Button style={button} href="https://roforest.ro/auctions">
                Explorează licitațiile active
              </Button>
            </Section>

            <Section style={buttonContainer}>
              <Button style={secondaryButton} href="https://roforest.ro/create-listing">
                Creează prima ta licitație
              </Button>
            </Section>

            {/* Quick Start Guide */}
            <Section style={guideBox}>
              <Heading style={guideTitle}>🚀 Ghid rapid de start</Heading>

              <Text style={guideStep}>
                <strong>1. Completează-ți profilul</strong> – Adaugă informații despre tine pentru a crește încrederea altor utilizatori.
              </Text>

              <Text style={guideStep}>
                <strong>2. Explorează licitațiile</strong> – Filtrează după locație, suprafață, preț și specii pentru a găsi oferta perfectă.
              </Text>

              <Text style={guideStep}>
                <strong>3. Plasează o ofertă</strong> – Găsit ceva interesant? Licitează acum sau activează licitarea automată.
              </Text>

              <Text style={guideStep}>
                <strong>4. Monitorizează progresul</strong> – Urmărește licitațiile tale din dashboard și primește notificări.
              </Text>
            </Section>

            <Section style={helpBox}>
              <Text style={helpText}>
                <strong>Ai nevoie de ajutor?</strong>
              </Text>
              <Text style={helpText}>
                Echipa noastră de suport este aici pentru tine.{' '}
                <a href="https://roforest.ro/support" style={link}>
                  Contactează-ne
                </a>{' '}
                sau vizitează{' '}
                <a href="https://roforest.ro/faq" style={link}>
                  secțiunea FAQ
                </a>
                .
              </Text>
            </Section>

            <Text style={closingText}>
              Mult succes și licitații câștigătoare!
            </Text>

            <Text style={signature}>
              Echipa RoForest
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Acest email a fost trimis către <strong>{userEmail}</strong>
            </Text>
            <Text style={footerText}>
              <a href="https://roforest.ro/dashboard" style={link}>
                Dashboard
              </a>
              {' • '}
              <a href="https://roforest.ro/settings" style={link}>
                Setări cont
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

export default WelcomeEmail;

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

const featuresBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '24px',
  margin: '32px 0',
};

const featuresTitle = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 20px',
  textAlign: 'center' as const,
};

const feature = {
  display: 'flex',
  gap: '12px',
  margin: '16px 0',
  alignItems: 'flex-start' as const,
};

const featureIcon = {
  fontSize: '24px',
  margin: '0',
  padding: '0',
  lineHeight: '1',
};

const featureTitle = {
  color: '#1f2937',
  fontSize: '15px',
  fontWeight: 'bold',
  margin: '0 0 4px',
};

const featureText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const guideBox = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: '8px',
  padding: '24px',
  margin: '32px 0',
};

const guideTitle = {
  color: '#166534',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const guideStep = {
  color: '#166534',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '12px 0',
};

const helpBox = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fde047',
  borderRadius: '8px',
  padding: '20px',
  margin: '32px 0',
  textAlign: 'center' as const,
};

const helpText = {
  color: '#78350f',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '20px 0',
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

const secondaryButton = {
  backgroundColor: '#ffffff',
  border: '2px solid #0f4c2d',
  borderRadius: '6px',
  color: '#0f4c2d',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
  cursor: 'pointer',
};

const closingText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '32px 0 8px',
};

const signature = {
  color: '#6b7280',
  fontSize: '16px',
  fontStyle: 'italic',
  margin: '0',
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
