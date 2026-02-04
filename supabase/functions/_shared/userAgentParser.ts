/**
 * Parse user agent string to extract email client, device type, and OS
 */
export interface ParsedUserAgent {
  emailClient: string | null;
  emailClientVersion: string | null;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  osName: string | null;
}

export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  if (!userAgent) {
    return {
      emailClient: null,
      emailClientVersion: null,
      deviceType: 'unknown',
      osName: null,
    };
  }

  const ua = userAgent.toLowerCase();
  let emailClient: string | null = null;
  let emailClientVersion: string | null = null;
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
  let osName: string | null = null;

  // Detect email clients
  if (ua.includes('googleimageproxy') || ua.includes('gmail')) {
    emailClient = 'Gmail';
  } else if (ua.includes('outlook') || ua.includes('microsoft office') || ua.includes('ms-office')) {
    emailClient = 'Outlook';
    const outlookMatch = userAgent.match(/Outlook[\/\s]?([\d.]+)/i);
    if (outlookMatch) emailClientVersion = outlookMatch[1];
  } else if (ua.includes('apple mail') || ua.includes('applemail')) {
    emailClient = 'Apple Mail';
  } else if (ua.includes('thunderbird')) {
    emailClient = 'Thunderbird';
    const tbMatch = userAgent.match(/Thunderbird\/([\d.]+)/i);
    if (tbMatch) emailClientVersion = tbMatch[1];
  } else if (ua.includes('yahoo')) {
    emailClient = 'Yahoo Mail';
  } else if (ua.includes('aol')) {
    emailClient = 'AOL Mail';
  } else if (ua.includes('protonmail')) {
    emailClient = 'ProtonMail';
  } else if (ua.includes('samsung mail')) {
    emailClient = 'Samsung Mail';
  } else if (ua.includes('spark')) {
    emailClient = 'Spark';
  } else if (ua.includes('mail.ru')) {
    emailClient = 'Mail.ru';
  }
  // If no specific email client detected, try to infer from browser used to open web mail
  else if (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android')) {
    // Could be Apple Mail on iOS/macOS or Safari webmail
    if (ua.includes('iphone') || ua.includes('ipad')) {
      emailClient = 'Apple Mail (iOS)';
    } else if (ua.includes('macintosh')) {
      emailClient = 'Safari (Web)';
    }
  } else if (ua.includes('chrome')) {
    emailClient = 'Chrome (Web)';
  } else if (ua.includes('firefox')) {
    emailClient = 'Firefox (Web)';
  } else if (ua.includes('edge')) {
    emailClient = 'Edge (Web)';
  }

  // Detect device type
  if (ua.includes('iphone') || ua.includes('android') && ua.includes('mobile')) {
    deviceType = 'mobile';
  } else if (ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
    deviceType = 'tablet';
  } else if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) {
    deviceType = 'desktop';
  }

  // Detect OS
  if (ua.includes('windows nt 10') || ua.includes('windows 10')) {
    osName = 'Windows 10/11';
  } else if (ua.includes('windows nt')) {
    osName = 'Windows';
  } else if (ua.includes('macintosh') || ua.includes('mac os')) {
    osName = 'macOS';
  } else if (ua.includes('iphone os') || ua.includes('iphone')) {
    const iosMatch = userAgent.match(/iPhone OS (\d+)/i);
    osName = iosMatch ? `iOS ${iosMatch[1]}` : 'iOS';
  } else if (ua.includes('ipad')) {
    const ipadMatch = userAgent.match(/CPU OS (\d+)/i);
    osName = ipadMatch ? `iPadOS ${ipadMatch[1]}` : 'iPadOS';
  } else if (ua.includes('android')) {
    const androidMatch = userAgent.match(/Android ([\d.]+)/i);
    osName = androidMatch ? `Android ${androidMatch[1]}` : 'Android';
  } else if (ua.includes('linux')) {
    osName = 'Linux';
  }

  return {
    emailClient,
    emailClientVersion,
    deviceType,
    osName,
  };
}
