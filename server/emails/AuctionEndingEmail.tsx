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

interface AuctionEndingEmailProps {
  userName: string;
  auctionTitle: string;
  currentBid: number;
  hoursLeft: number;
  auctionUrl: string;
  isLeading: boolean;
}

export const AuctionEndingEmail = ({
  userName = 'Utilizator',
  auctionTitle = 'Parcela forestieră',
  currentBid = 65000,
  hoursLeft = 24,
  auctionUrl = 'https://roforest.ro',
  isLeading = false,
}: AuctionEndingEmailProps) => {
  const formattedBid = currentBid.toLocaleString('ro-RO');

  // Calculate time display
  let timeDisplay = '';
  if (hoursLeft < 1) {
    const minutesLeft = Math.round(hoursLeft * 60);
    timeDisplay = `${minutesLeft} minute`;
  } else if (hoursLeft === 1) {
    timeDisplay = '1 oră';
  } else if (hoursLeft < 24) {
    timeDisplay = `${Math.round(hoursLeft)} ore`;
  } else {
    const daysLeft = Math.round(hoursLeft / 24);
    timeDisplay = daysLeft === 1 ? '1 zi' : `${daysLeft} zile`;
  }

  return (
    <Html>
      <Head />
      <Preview>Licitația pentru {auctionTitle} se încheie în {timeDisplay}!</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logoText}>🌲 RoForest</Heading>
            <Text style={tagline}>Licitații Forestiere</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <div style={urgencyIcon}>⏰</div>
            <Heading style={h1}>Licitație se încheie curând!</Heading>

            <Text style={text}>
              Bună ziua <strong>{userName}</strong>,
            </Text>

            <Text style={text}>
              {isLeading ? (
                <>
                  Te avertizăm că licitația pentru <strong>{auctionTitle}</strong> la care
                  <strong> conduci</strong> se va încheia în curând.
                </>
              ) : (
                <>
                  Te avertizăm că licitația pentru <strong>{auctionTitle}</strong> la care
                  participi se va încheia în curând.
                </>
              )}
            </Text>

            {/* Urgency Box */}
            <Section style={isLeading ? leadingBox : urgencyBox}>
              <table style={infoTable}>
                <tr>
                  <td>
                    <Text style={label}>Timp rămas:</Text>
                    <Text style={isLeading ? leadingValue : urgencyValue}>
                      {timeDisplay}
                    </Text>
                  </td>
                  <td style={dividerCell}>
                    <div style={divider}></div>
                  </td>
                  <td>
                    <Text style={label}>Oferta curentă:</Text>
                    <Text style={isLeading ? leadingValue : urgencyValue}>
                      {formattedBid} RON
                    </Text>
                  </td>
                </tr>
              </table>

              {isLeading && (
                <Section style={statusBadge}>
                  <Text style={statusText}>✓ Tu conduci licitația</Text>
                </Section>
              )}
            </Section>

            {isLeading ? (
              <>
                <Text style={text}>
                  <strong>Felicitări!</strong> Momentan deții cea mai mare ofertă pentru această licitație.
                  Dacă nimeni nu plasează o ofertă mai mare până la încheierea licitației, vei câștiga!
                </Text>

                <Section style={warningBox}>
                  <Text style={warningIcon}>⚠️</Text>
                  <div>
                    <Text style={warningTitle}>Monitorizează până la final</Text>
                    <Text style={warningText}>
                      Alți participanți pot plasa oferte în ultimele momente. Verifică licitația
                      regulat pentru a te asigura că rămâi în frunte.
                    </Text>
                  </div>
                </Section>
              </>
            ) : (
              <>
                <Text style={text}>
                  Aceasta este ultima ta șansă de a plasa o ofertă mai mare și de a câștiga această oportunitate!
                </Text>

                <Section style={actionBox}>
                  <Text style={actionTitle}>💡 Acționează acum!</Text>
                  <ul style={actionList}>
                    <li style={actionItem}>
                      <Text style={actionText}>
                        Plasează o ofertă mai mare decât <strong>{formattedBid} RON</strong>
                      </Text>
                    </li>
                    <li style={actionItem}>
                      <Text style={actionText}>
                        Sau folosește <strong>Licitare Automată</strong> pentru a plasa automat oferte în numele tău
                      </Text>
                    </li>
                  </ul>
                </Section>
              </>
            )}

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={auctionUrl}>
                {isLeading ? 'Monitorizează licitația' : 'Vezi licitația și licitează acum'}
              </Button>
            </Section>

            {/* Info Box */}
            <Section style={infoBox}>
              <Text style={infoTitle}>📋 Detalii parcelă</Text>
              <Text style={infoText}>
                Vizitează pagina licitației pentru a vedea:
              </Text>
              <Text style={infoText}>
                • Documentul APV oficial
              </Text>
              <Text style={infoText}>
                • Suprafața, volumul și speciile de arbori
              </Text>
              <Text style={infoText}>
                • Fotografii și localizare pe hartă
              </Text>
              <Text style={infoText}>
                • Istoricul complet al ofertelor
              </Text>
            </Section>

            <Text style={closingText}>
              {isLeading ? (
                'Mult succes în finalul licitației!'
              ) : (
                'Nu pierde această oportunitate!'
              )}
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

export default AuctionEndingEmail;

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

const urgencyIcon = {
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

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const urgencyBox = {
  backgroundColor: '#fee2e2',
  border: '2px solid #ef4444',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const leadingBox = {
  backgroundColor: '#d1fae5',
  border: '2px solid #10b981',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const infoTable = {
  width: '100%',
  textAlign: 'center' as const,
};

const dividerCell = {
  padding: '0 16px',
};

const divider = {
  width: '1px',
  height: '50px',
  backgroundColor: '#9ca3af',
};

const label = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px',
  textAlign: 'center' as const,
};

const urgencyValue = {
  color: '#dc2626',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'center' as const,
};

const leadingValue = {
  color: '#059669',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'center' as const,
};

const statusBadge = {
  textAlign: 'center' as const,
  marginTop: '16px',
};

const statusText = {
  backgroundColor: '#10b981',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  display: 'inline-block',
  padding: '8px 20px',
  borderRadius: '20px',
  margin: '0',
};

const warningBox = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  display: 'flex',
  gap: '12px',
};

const warningIcon = {
  fontSize: '24px',
  margin: '0',
};

const warningTitle = {
  color: '#78350f',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const warningText = {
  color: '#78350f',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const actionBox = {
  backgroundColor: '#dbeafe',
  border: '1px solid #60a5fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const actionTitle = {
  color: '#1e40af',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const actionList = {
  margin: '0',
  padding: '0 0 0 20px',
};

const actionItem = {
  margin: '8px 0',
};

const actionText = {
  color: '#1e40af',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const infoBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const infoTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const infoText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '6px 0',
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

const closingText = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: 'bold',
  lineHeight: '24px',
  margin: '32px 0',
  textAlign: 'center' as const,
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
