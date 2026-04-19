import { getMailchimpSecrets, getSendGridSecrets } from './secrets'

function getMailchimpDataCenter(apiKey: string): string {
  // API key format: key-dcN (e.g. abc123-us6)
  const parts = apiKey.split('-')
  return parts[parts.length - 1] ?? 'us1'
}

export async function dispatchMailchimp(
  subjectLine: string,
  htmlBody: string,
): Promise<string> {
  const { apiKey, audienceId } = getMailchimpSecrets()
  const dc = getMailchimpDataCenter(apiKey)
  const base = `https://${dc}.api.mailchimp.com/3.0`
  const auth = `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`

  // Step 1: Create campaign
  const createResponse = await fetch(`${base}/campaigns`, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'regular',
      recipients: { list_id: audienceId },
      settings: {
        subject_line: subjectLine,
        from_name: 'Content Engine',
        reply_to: 'noreply@contentengine.app',
        title: `CE: ${subjectLine.slice(0, 40)}`,
      },
    }),
  })

  if (!createResponse.ok) {
    const err = await createResponse.json() as { title?: string; detail?: string }
    throw new Error(`Mailchimp create campaign error: ${err.title ?? err.detail ?? createResponse.status}`)
  }

  const campaign = await createResponse.json() as { id: string }
  const campaignId = campaign.id

  // Step 2: Set campaign content
  const contentResponse = await fetch(`${base}/campaigns/${campaignId}/content`, {
    method: 'PUT',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ html: htmlBody }),
  })

  if (!contentResponse.ok) {
    const err = await contentResponse.json() as { title?: string }
    throw new Error(`Mailchimp set content error: ${err.title ?? contentResponse.status}`)
  }

  // Step 3: Send campaign
  const sendResponse = await fetch(`${base}/campaigns/${campaignId}/actions/send`, {
    method: 'POST',
    headers: { Authorization: auth },
  })

  if (!sendResponse.ok && sendResponse.status !== 204) {
    const errText = await sendResponse.text()
    throw new Error(`Mailchimp send error ${sendResponse.status}: ${errText}`)
  }

  return campaignId
}

export async function dispatchSendGrid(
  subjectLine: string,
  htmlBody: string,
  recipientEmail: string,
): Promise<string> {
  const { apiKey } = getSendGridSecrets()

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: recipientEmail }] }],
      from: { email: 'noreply@contentengine.app', name: 'Content Engine' },
      subject: subjectLine,
      content: [{ type: 'text/html', value: htmlBody }],
    }),
  })

  // SendGrid returns 202 on success with no body
  if (!response.ok && response.status !== 202) {
    const errBody = await response.text()
    throw new Error(`SendGrid error ${response.status}: ${errBody}`)
  }

  return `sg_${Date.now()}`
}
