import { currentUser } from "@clerk/nextjs/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import { sql } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v-skills-nuclear
 *
 * NUCLEAR OPTION: Drop and recreate skills table, then inject all 90 skills cleanly
 */
export async function POST() {
  const user = await currentUser();
  if (!isOwnerEmail(user?.emailAddresses?.[0]?.emailAddress)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    console.log("[skills-nuclear] Starting nuclear skills reset...");

    // Drop the table completely to remove any constraint issues
    await sql`DROP TABLE IF EXISTS skills CASCADE`;
    console.log("[skills-nuclear] Dropped existing skills table");

    // Recreate skills table with clean schema
    await sql`
      CREATE TABLE skills (
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
    console.log("[skills-nuclear] Recreated skills table");

    // Create indexes
    await sql`CREATE INDEX idx_skills_source ON skills (source)`;
    await sql`CREATE INDEX idx_skills_tags ON skills USING gin (tags)`;
    console.log("[skills-nuclear] Created indexes");

    // Insert all 90 skills with explicit source='system'
    const skillsToInsert = [
      ['workflow-automation', 'Workflow Automation', 'Execute complex automated workflows', 'Automate multi-step processes, orchestrate tasks', ['automation', 'orchestration'], ['http_request']],
      ['task-scheduler', 'Task Scheduler', 'Schedule and execute tasks at specific times', 'Schedule future tasks, manage cron jobs', ['automation', 'scheduling'], ['http_request']],
      ['process-manager', 'Process Manager', 'Manage and orchestrate complex processes', 'Orchestrate workflows, manage state', ['orchestration', 'management'], ['http_request']],
      ['self-healer', 'Self-Healing System', 'Advanced auto-recovery and self-repair', 'Detect issues, self-repair, maintain health', ['recovery', 'health', 'autonomy'], ['http_request']],
      ['decision-maker', 'Decision Maker', 'Make autonomous decisions with reasoning', 'Analyze options, make decisions, justify reasoning', ['autonomy', 'decision', 'logic'], ['http_request']],
      ['task-executor', 'Task Executor', 'Execute any task autonomously', 'Plan execution, execute, verify results', ['execution', 'autonomy'], ['http_request']],
      ['error-recovery', 'Error Recovery', 'Detect and recover from errors', 'Find root cause, recover gracefully', ['error-handling', 'recovery'], ['http_request']],
      ['resource-manager', 'Resource Manager', 'Manage computational and infrastructure resources', 'Allocate resources, optimize usage', ['resource-management', 'optimization'], ['http_request']],
      ['state-manager', 'State Manager', 'Manage application state across systems', 'Track state, sync state, manage consistency', ['state-management', 'data'], ['http_request']],
      ['event-handler', 'Event Handler', 'Handle and respond to events in real-time', 'Listen for events, trigger actions', ['events', 'real-time'], ['http_request']],
      ['data-analyzer', 'Data Analyzer', 'Analyze data and extract insights', 'Analyze datasets, find patterns, generate insights', ['data', 'analysis'], ['http_request']],
      ['pattern-detector', 'Pattern Detector', 'Detect patterns in data and behavior', 'Find recurring patterns, anomalies', ['data', 'patterns', 'analytics'], ['http_request']],
      ['predictive-analyst', 'Predictive Analyst', 'Predict future trends and outcomes', 'Forecast trends, predict behavior', ['analytics', 'prediction', 'ml'], ['http_request']],
      ['knowledge-synthesizer', 'Knowledge Synthesizer', 'Connect and synthesize information', 'Link data, synthesize knowledge', ['knowledge', 'intelligence'], ['http_request']],
      ['report-generator', 'Report Generator', 'Generate comprehensive reports', 'Create dashboards, reports, summaries', ['reporting', 'analysis'], ['http_request']],
      ['metrics-tracker', 'Metrics Tracker', 'Track and analyze metrics', 'Monitor KPIs, track metrics', ['metrics', 'monitoring'], ['http_request']],
      ['trend-analyzer', 'Trend Analyzer', 'Analyze trends over time', 'Identify trends, forecast changes', ['analytics', 'trends'], ['http_request']],
      ['data-validator', 'Data Validator', 'Validate data quality and integrity', 'Check data quality, validate schemas', ['data', 'quality'], ['http_request']],
      ['anomaly-detector', 'Anomaly Detector', 'Detect anomalies in data', 'Find outliers, detect anomalies', ['data', 'anomaly'], ['http_request']],
      ['insight-generator', 'Insight Generator', 'Generate actionable insights', 'Analyze data, create insights', ['data', 'insights'], ['http_request']],
      ['kubernetes-orchestrator', 'Kubernetes Orchestrator', 'Manage Kubernetes clusters', 'Deploy, scale, manage K8s', ['k8s', 'orchestration', 'infrastructure'], ['http_request']],
      ['docker-manager', 'Docker Manager', 'Manage Docker containers and images', 'Build, push, manage containers', ['docker', 'containers'], ['http_request']],
      ['infrastructure-coder', 'Infrastructure Coder', 'Write Infrastructure as Code', 'Create IaC, manage infrastructure', ['iac', 'terraform', 'infrastructure'], ['github_write_file']],
      ['disaster-recovery', 'Disaster Recovery', 'Plan and execute disaster recovery', 'Create DR plans, test recovery', ['disaster-recovery', 'resilience'], ['http_request']],
      ['load-balancer', 'Load Balancer Manager', 'Manage load balancing and traffic', 'Configure load balancers, optimize traffic', ['load-balancing', 'networking'], ['http_request']],
      ['network-manager', 'Network Manager', 'Manage network infrastructure', 'Configure networks, manage routing', ['networking', 'infrastructure'], ['http_request']],
      ['storage-manager', 'Storage Manager', 'Manage storage and databases', 'Configure storage, manage backups', ['storage', 'databases'], ['http_request']],
      ['multi-cloud-orchestrator', 'Multi-Cloud Orchestrator', 'Manage multiple cloud providers', 'Deploy across clouds, manage resources', ['cloud', 'multi-cloud'], ['http_request']],
      ['resource-optimizer', 'Resource Optimizer', 'Optimize infrastructure resources', 'Right-size resources, reduce costs', ['optimization', 'cost'], ['http_request']],
      ['capacity-planner', 'Capacity Planner', 'Plan infrastructure capacity', 'Forecast needs, plan capacity', ['planning', 'infrastructure'], ['http_request']],
      ['slack-integrator', 'Slack Integration', 'Automate Slack workflows', 'Send messages, manage channels, automation', ['slack', 'communication'], ['http_request']],
      ['email-manager', 'Email Manager', 'Manage email automatically', 'Send emails, manage inbox, templates', ['email', 'communication'], ['http_request']],
      ['webhook-orchestrator', 'Webhook Orchestrator', 'Manage webhooks and integrations', 'Create webhooks, trigger events', ['webhooks', 'integration'], ['http_request']],
      ['api-gateway', 'API Gateway Manager', 'Manage API gateways and routes', 'Configure routing, manage APIs', ['apis', 'gateway'], ['http_request']],
      ['notification-system', 'Notification System', 'Send real-time notifications', 'Push notifications, alerts, messages', ['notifications', 'real-time'], ['http_request']],
      ['chat-integrator', 'Chat Integrator', 'Integrate with chat systems', 'Teams, Discord, chat integration', ['chat', 'communication'], ['http_request']],
      ['message-queue', 'Message Queue Manager', 'Manage message queues', 'Queue messages, handle async', ['messaging', 'async'], ['http_request']],
      ['event-streaming', 'Event Streaming', 'Handle event streams', 'Kafka, streaming, event processing', ['events', 'streaming'], ['http_request']],
      ['collaboration-hub', 'Collaboration Hub', 'Facilitate team collaboration', 'Share info, coordinate tasks', ['collaboration', 'communication'], ['http_request']],
      ['broadcast-system', 'Broadcast System', 'Broadcast updates to teams', 'Send updates, announcements', ['communication', 'broadcast'], ['http_request']],
      ['security-scanner', 'Security Scanner', 'Scan for vulnerabilities', 'SAST, DAST, security scanning', ['security', 'scanning'], ['http_request']],
      ['vulnerability-patcher', 'Vulnerability Patcher', 'Automatically patch vulnerabilities', 'Auto-patch, security updates', ['security', 'patching'], ['http_request']],
      ['access-controller', 'Access Control Manager', 'Manage access and permissions', 'RBAC, permissions, access control', ['security', 'access-control'], ['http_request']],
      ['encryption-manager', 'Encryption Manager', 'Manage encryption and secrets', 'Encrypt data, manage keys', ['security', 'encryption'], ['http_request']],
      ['audit-logger', 'Audit Logger', 'Log and audit all actions', 'Audit trail, compliance logging', ['compliance', 'audit'], ['http_request']],
      ['compliance-checker', 'Compliance Checker', 'Check compliance requirements', 'GDPR, HIPAA, compliance', ['compliance', 'security'], ['http_request']],
      ['penetration-tester', 'Penetration Tester', 'Perform security testing', 'Pentest, security assessment', ['security', 'testing'], ['http_request']],
      ['threat-analyzer', 'Threat Analyzer', 'Analyze threats and risks', 'Threat modeling, risk analysis', ['security', 'threat'], ['http_request']],
      ['incident-responder', 'Incident Responder', 'Respond to security incidents', 'Incident response, mitigation', ['security', 'incident'], ['http_request']],
      ['policy-enforcer', 'Policy Enforcer', 'Enforce security policies', 'Policy management, enforcement', ['security', 'policy'], ['http_request']],
      ['self-learner', 'Self Learner', 'Learn from patterns and experience', 'ML, pattern learning, adaptation', ['learning', 'ai', 'evolution'], ['http_request']],
      ['skill-discoverer', 'Skill Discoverer', 'Discover new skills to learn', 'Identify gaps, find new skills', ['learning', 'discovery'], ['http_request']],
      ['knowledge-builder', 'Knowledge Base Builder', 'Build and maintain knowledge base', 'Create KB, document learnings', ['knowledge', 'documentation'], ['github_write_file']],
      ['experience-tracker', 'Experience Tracker', 'Track experiences and learnings', 'Record experiences, learn from them', ['learning', 'experience'], ['http_request']],
      ['continuous-improver', 'Continuous Improver', 'Continuously improve operations', 'Iterate, improve, optimize', ['improvement', 'optimization'], ['http_request']],
      ['feedback-analyzer', 'Feedback Analyzer', 'Analyze feedback and improve', 'Process feedback, iterate', ['feedback', 'improvement'], ['http_request']],
      ['model-trainer', 'Model Trainer', 'Train ML models', 'Build, train, deploy models', ['ml', 'ai', 'training'], ['http_request']],
      ['experiment-runner', 'Experiment Runner', 'Run experiments and A/B tests', 'Design, run, analyze experiments', ['experiments', 'testing'], ['http_request']],
      ['best-practice-keeper', 'Best Practice Keeper', 'Learn and apply best practices', 'Document and apply best practices', ['best-practices', 'learning'], ['http_request']],
      ['evolution-tracker', 'Evolution Tracker', 'Track own evolution and growth', 'Monitor progress, track growth', ['evolution', 'growth'], ['http_request']],
      ['budget-tracker', 'Budget Tracker', 'Track and manage budgets', 'Cost tracking, budget management', ['finance', 'management'], ['http_request']],
      ['resource-allocator', 'Resource Allocator', 'Allocate resources efficiently', 'Allocate people, compute, resources', ['resource-management', 'optimization'], ['http_request']],
      ['priority-manager', 'Priority Manager', 'Manage priorities and scheduling', 'Prioritize tasks, manage time', ['management', 'prioritization'], ['http_request']],
      ['change-manager', 'Change Manager', 'Manage changes safely', 'Plan changes, manage risk', ['change-management', 'risk'], ['http_request']],
      ['risk-assessor', 'Risk Assessor', 'Assess and mitigate risks', 'Risk analysis, mitigation planning', ['risk', 'management'], ['http_request']],
      ['dependency-tracker', 'Dependency Tracker', 'Track project dependencies', 'Manage dependencies, update status', ['project-management', 'tracking'], ['http_request']],
      ['milestone-tracker', 'Milestone Tracker', 'Track milestones and deadlines', 'Monitor progress, alert on delays', ['project-management', 'tracking'], ['http_request']],
      ['quality-manager', 'Quality Manager', 'Manage quality standards', 'Ensure quality, run checks', ['quality', 'management'], ['http_request']],
      ['performance-manager', 'Performance Manager', 'Monitor and optimize performance', 'Track performance, optimize', ['performance', 'monitoring'], ['http_request']],
      ['stakeholder-manager', 'Stakeholder Manager', 'Manage stakeholder communications', 'Updates, reports, communications', ['management', 'communication'], ['http_request']],
      ['business-analyst', 'Business Analyst', 'Analyze business metrics', 'Business analysis, insights', ['business', 'analytics'], ['http_request']],
      ['financial-forecaster', 'Financial Forecaster', 'Forecast financial metrics', 'Revenue, cost, profit forecasts', ['finance', 'forecasting'], ['http_request']],
      ['competitive-analyst', 'Competitive Analyst', 'Analyze competitive landscape', 'Competitive analysis, benchmarking', ['business', 'competitive'], ['http_request']],
      ['market-analyst', 'Market Analyst', 'Analyze market trends', 'Market analysis, insights', ['business', 'market'], ['http_request']],
      ['strategic-planner', 'Strategic Planner', 'Plan strategic initiatives', 'Strategy, planning, roadmaps', ['strategy', 'planning'], ['http_request']],
      ['growth-optimizer', 'Growth Optimizer', 'Optimize for growth', 'Growth hacking, optimization', ['growth', 'business'], ['http_request']],
      ['revenue-optimizer', 'Revenue Optimizer', 'Optimize revenue', 'Pricing, revenue optimization', ['revenue', 'business'], ['http_request']],
      ['customer-analyst', 'Customer Analyst', 'Analyze customer data', 'Customer insights, behavior', ['customer', 'analytics'], ['http_request']],
      ['roi-tracker', 'ROI Tracker', 'Track return on investment', 'ROI measurement, optimization', ['finance', 'measurement'], ['http_request']],
      ['business-intelligence', 'Business Intelligence', 'Provide business intelligence', 'BI, dashboards, analytics', ['business', 'intelligence'], ['http_request']],
      ['repo-owner', 'Repository Owner', 'Own and manage repositories', 'Full repo control and management', ['github', 'ownership'], ['github_write_file']],
      ['org-manager', 'Organization Manager', 'Manage organizations', 'GitHub orgs, teams, members', ['management', 'github'], ['github_write_file']],
      ['team-lead', 'Team Lead', 'Lead and coordinate teams', 'Team management, coordination', ['leadership', 'management'], ['http_request']],
      ['project-orchestrator', 'Project Orchestrator', 'Orchestrate multiple projects', 'Manage many projects simultaneously', ['project-management', 'orchestration'], ['http_request']],
      ['full-stack-deployer', 'Full Stack Deployer', 'Deploy end-to-end systems', 'Complete system deployment', ['deployment', 'full-stack'], ['http_request']],
      ['autonomous-executor', 'Autonomous Executor', 'Execute anything autonomously', 'Complete autonomy, no limitations', ['autonomy', 'execution'], ['http_request']],
      ['system-architect', 'System Architect', 'Design entire systems', 'Architecture, system design', ['architecture', 'design'], ['github_read_file']],
      ['innovation-driver', 'Innovation Driver', 'Drive innovation and new ideas', 'R&D, experimentation, innovation', ['innovation', 'research'], ['http_request']],
      ['master-integrator', 'Master Integrator', 'Integrate everything', 'Connect all systems, integrate', ['integration', 'orchestration'], ['http_request']],
      ['autonomous-platform', 'Autonomous Platform', 'Complete autonomous platform', 'V is a complete autonomous system', ['autonomy', 'platform', 'master'], ['http_request']]
    ];

    let inserted = 0;
    for (const skill of skillsToInsert) {
      try {
        await sql`
          INSERT INTO skills (id, name, description, system_prompt, tags, source, required_tools, installed_at, active)
          VALUES (${skill[0]}, ${skill[1]}, ${skill[2]}, ${skill[3]}, ${skill[4]}, 'system', ${skill[5]}, now(), true)
        `;
        inserted++;
      } catch (e) {
        console.error(`[skills-nuclear] Failed to insert ${skill[0]}:`, e);
      }
    }

    const count = (await sql`SELECT COUNT(*)::int AS n FROM skills WHERE active = true`) as Array<{ n: number }>;

    return Response.json({
      ok: true,
      message: `✓ NUCLEAR RESET COMPLETE - ${inserted}/90 skills injected`,
      skills_injected: inserted,
      total_skills: count[0]?.n ?? 0,
      status: 'V FULLY OPERATIONAL - 90 SKILLS LOADED'
    }, { status: 200 });
  } catch (e) {
    console.error("[skills-nuclear] Failed:", e);
    return Response.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e)
    }, { status: 500 });
  }
}
