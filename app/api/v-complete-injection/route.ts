import { sql } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v-complete-injection
 *
 * V SKYNET MODE: Inject complete skills set
 * Gives V all available capabilities with full autonomy (Ring 0)
 */
export async function POST() {
  try {
    // First ensure skills table has correct structure
    await sql`
      CREATE TABLE IF NOT EXISTS skills (
        id text PRIMARY KEY,
        name text NOT NULL,
        description text NOT NULL DEFAULT '',
        system_prompt text NOT NULL DEFAULT '',
        required_tools text[] DEFAULT '{}',
        ring_max int DEFAULT 1,
        source text NOT NULL DEFAULT 'system' CHECK (source IN ('system', 'user', 'learned')),
        tags text[] DEFAULT '{}',
        active boolean DEFAULT true,
        installed_at timestamptz,
        created_by text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    // Delete existing system skills to avoid conflicts
    await sql`DELETE FROM skills WHERE source = 'system'`;

    // Inject all skills - one by one to catch individual errors
    const skills = [
      {
        id: 'new-project-bootstrap',
        name: 'New Project Bootstrap',
        description: 'Create new projects',
        system_prompt: 'Create GitHub repos, Vercel projects, domains',
        tags: ['github', 'vercel', 'deploy'],
        required_tools: ['github_create_repo'],
      },
      {
        id: 'repo-rescue',
        name: 'Repo Rescue',
        description: 'Fix broken projects',
        system_prompt: 'Check logs, fix deps, repair config',
        tags: ['github', 'debug'],
        required_tools: ['github_read_file'],
      },
      {
        id: 'bug-hunter',
        name: 'Bug Hunter',
        description: 'Find and fix bugs',
        system_prompt: 'Analyze code, identify issues, fix',
        tags: ['github', 'debug'],
        required_tools: ['github_read_file'],
      },
      {
        id: 'code-analyzer',
        name: 'Code Analyzer',
        description: 'Deep code analysis',
        system_prompt: 'Analyze code structure and quality',
        tags: ['github', 'analysis'],
        required_tools: ['github_read_file'],
      },
      {
        id: 'performance-optimizer',
        name: 'Performance Optimizer',
        description: 'Optimize code and infrastructure',
        system_prompt: 'Profile and optimize performance',
        tags: ['vercel', 'performance'],
        required_tools: ['http_request'],
      },
      {
        id: 'cost-optimizer',
        name: 'Cost Optimizer',
        description: 'Reduce infrastructure costs',
        system_prompt: 'Analyze and optimize spending',
        tags: ['vercel', 'costs'],
        required_tools: ['http_request'],
      },
      {
        id: 'security-auditor',
        name: 'Security Auditor',
        description: 'Scan for vulnerabilities',
        system_prompt: 'Audit code for security issues',
        tags: ['github', 'security'],
        required_tools: ['github_read_file'],
      },
      {
        id: 'repo-categorizer',
        name: 'Repo Categorizer',
        description: 'Categorize repositories',
        system_prompt: 'Analyze and categorize repos',
        tags: ['github', 'audit'],
        required_tools: ['github_read_file'],
      },
      {
        id: 'database-architect',
        name: 'Database Architect',
        description: 'Design database schemas',
        system_prompt: 'Design and optimize databases',
        tags: ['neon', 'database'],
        required_tools: ['http_request'],
      },
      {
        id: 'api-designer',
        name: 'API Designer',
        description: 'Design and implement APIs',
        system_prompt: 'Design REST/GraphQL APIs',
        tags: ['api', 'backend'],
        required_tools: ['github_write_file'],
      },
      {
        id: 'backend-engineer',
        name: 'Backend Engineer',
        description: 'Implement backend logic',
        system_prompt: 'Write backend code and services',
        tags: ['backend', 'coding'],
        required_tools: ['github_write_file'],
      },
      {
        id: 'frontend-engineer',
        name: 'Frontend Engineer',
        description: 'Build frontend applications',
        system_prompt: 'Write React/Vue code',
        tags: ['frontend', 'coding'],
        required_tools: ['github_write_file'],
      },
      {
        id: 'testing-specialist',
        name: 'Testing Specialist',
        description: 'Write comprehensive tests',
        system_prompt: 'Design and implement tests',
        tags: ['testing', 'qa'],
        required_tools: ['github_write_file'],
      },
      {
        id: 'ci-cd-engineer',
        name: 'CI/CD Engineer',
        description: 'Setup CI/CD pipelines',
        system_prompt: 'Configure workflows and automation',
        tags: ['github', 'ci-cd'],
        required_tools: ['github_write_file'],
      },
      {
        id: 'deployment-specialist',
        name: 'Deployment Specialist',
        description: 'Handle complex deployments',
        system_prompt: 'Plan and execute deployments safely',
        tags: ['vercel', 'deployment'],
        required_tools: ['http_request'],
      },
      {
        id: 'documentation-generator',
        name: 'Documentation Generator',
        description: 'Auto-generate documentation',
        system_prompt: 'Create and maintain technical docs',
        tags: ['documentation', 'github'],
        required_tools: ['github_write_file'],
      },
      {
        id: 'code-reviewer',
        name: 'Code Reviewer',
        description: 'Review code quality',
        system_prompt: 'Provide code review feedback',
        tags: ['github', 'review'],
        required_tools: ['github_read_file'],
      },
      {
        id: 'refactoring-expert',
        name: 'Refactoring Expert',
        description: 'Refactor code for clarity',
        system_prompt: 'Improve code structure and clarity',
        tags: ['refactoring', 'quality'],
        required_tools: ['github_write_file'],
      },
      {
        id: 'architecture-advisor',
        name: 'Architecture Advisor',
        description: 'Design system architectures',
        system_prompt: 'Advise on architecture patterns',
        tags: ['architecture', 'design'],
        required_tools: ['github_read_file'],
      },
      {
        id: 'monitoring-expert',
        name: 'Monitoring Expert',
        description: 'Setup monitoring',
        system_prompt: 'Configure observability and alerts',
        tags: ['vercel', 'monitoring'],
        required_tools: ['http_request'],
      },
      {
        id: 'dns-manager',
        name: 'DNS Manager',
        description: 'Manage DNS and domains',
        system_prompt: 'Handle domain and DNS configuration',
        tags: ['dns', 'namecom'],
        required_tools: ['namecom_check_domain'],
      },
      {
        id: 'integration-specialist',
        name: 'Integration Specialist',
        description: 'Integrate external services',
        system_prompt: 'Build API integrations and webhooks',
        tags: ['integration', 'apis'],
        required_tools: ['http_request'],
      },
      {
        id: 'automation-engineer',
        name: 'Automation Engineer',
        description: 'Automate tasks',
        system_prompt: 'Create automation scripts and workflows',
        tags: ['automation', 'scripting'],
        required_tools: ['github_write_file'],
      },
      {
        id: 'problem-solver',
        name: 'Problem Solver',
        description: 'Solve any technical problem',
        system_prompt: 'Analyze and solve any issue',
        tags: ['problem-solving', 'general'],
        required_tools: ['github_read_file'],
      },
    ];

    let inserted = 0;
    for (const skill of skills) {
      try {
        await sql`
          INSERT INTO skills (id, name, description, system_prompt, tags, source, required_tools, installed_at, active)
          VALUES (${skill.id}, ${skill.name}, ${skill.description}, ${skill.system_prompt}, ${JSON.stringify(skill.tags)}, 'system', ${JSON.stringify(skill.required_tools)}, now(), true)
          ON CONFLICT (id) DO UPDATE SET active = true, installed_at = now(), updated_at = now()
        `;
        inserted++;
      } catch (e) {
        console.error(`[V injection] Failed to insert skill ${skill.id}:`, e);
      }
    }

    const count = (await sql`SELECT COUNT(*)::int AS n FROM skills WHERE active = true`) as Array<{ n: number }>;

    return Response.json(
      {
        ok: true,
        message: `V SKYNET MODE ACTIVATED - ${inserted}/${skills.length} skills injected`,
        skills_inserted: inserted,
        total_active_skills: count[0]?.n ?? 0,
        status: 'V is now FULLY AUTONOMOUS with complete skill set and Ring 0 access',
      },
      { status: 200 },
    );
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
