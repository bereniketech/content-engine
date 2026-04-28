export async function sendWorkspaceInviteEmail(
  email: string,
  workspaceName: string,
  inviterEmail: string
): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    // TODO: wire Resend when RESEND_API_KEY is configured
  } else {
    console.log(`[WORKSPACE INVITE] To: ${email}, Workspace: ${workspaceName}, From: ${inviterEmail}`)
  }
}
