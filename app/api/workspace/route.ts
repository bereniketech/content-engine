// OWASP checklist: JWT auth required, input validated, slug sanitized, generic errors.
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { sendWorkspaceInviteEmail } from '@/lib/workspace-email'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

export async function POST(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, { status: 401 })
  }

  const { user, supabase } = auth

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: { code: 'validation_error', message: 'Invalid JSON body' } }, { status: 400 })
  }

  const { name } = body as { name?: unknown }
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'name must be between 2 and 100 characters' } },
      { status: 400 }
    )
  }

  const trimmedName = name.trim()
  let slug = generateSlug(trimmedName)

  // Check slug uniqueness; retry with suffix once
  const { data: existing } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    const suffix = Math.random().toString(36).slice(2, 6)
    slug = `${slug}-${suffix}`.slice(0, 50)
  }

  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({ owner_id: user.id, name: trimmedName, slug })
    .select('*')
    .single()

  if (wsError || !workspace) {
    if (wsError?.code === '23505') {
      return NextResponse.json({ error: { code: 'conflict', message: 'Workspace slug already taken' } }, { status: 409 })
    }
    return NextResponse.json({ error: { code: 'db_error', message: 'Failed to create workspace' } }, { status: 500 })
  }

  // Add creator as admin member
  await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    email: user.email ?? '',
    role: 'admin',
    status: 'active',
    joined_at: new Date().toISOString(),
  })

  return NextResponse.json(
    {
      data: {
        id: workspace.id as string,
        name: workspace.name as string,
        slug: workspace.slug as string,
        ownerId: workspace.owner_id as string,
      },
    },
    { status: 201 }
  )
}

export async function GET(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, { status: 401 })
  }

  const { supabase } = auth

  const { data, error } = await supabase
    .from('workspaces')
    .select('id, name, slug, owner_id, feature_enabled, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: { code: 'db_error', message: 'Failed to fetch workspaces' } }, { status: 500 })
  }

  return NextResponse.json({
    data: (data ?? []).map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      ownerId: w.owner_id,
      featureEnabled: w.feature_enabled,
      createdAt: w.created_at,
    })),
  })
}
