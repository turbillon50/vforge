import { sql } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v-skills-nuclear
 *
 * NUCLEAR OPTION: Drop and recreate skills table, then inject all 90 skills cleanly
 */
export async function POST() {
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
      ['workflow-automation', 'Workflow Automation', 'Execute complex automated workflows', 'Automate multi-step processes, orchestrate tasks', ARRAY['automation', 'orchestration'], ARRAY['http_request']],
      ['task-scheduler', 'Task Scheduler', 'Schedule and execute tasks at specific times', 'Schedule future tasks, manage cron jobs', ARRAY['automation', 'scheduling'], ARRAY['http_request']],
      ['process-manager', 'Process Manager', 'Manage and orchestrate complex processes', 'Orchestrate workflows, manage state', ARRAY['orchestration', 'management'], ARRAY['http_request']],
      ['self-healer', 'Self-Healing System', 'Advanced auto-recovery and self-repair', 'Detect issues, self-repair, maintain health', ARRAY['recovery', 'health', 'autonomy'], ARRAY['http_request']],
      ['decision-maker', 'Decision Maker', 'Make autonomous decisions with reasoning', 'Analyze options, make decisions, justify reasoning', ARRAY['autonomy', 'decision', 'logic'], ARRAY['http_request']],
      ['task-executor', 'Task Executor', 'Execute any task autonomously', 'Plan execution, execute, verify results', ARRAY['execution', 'autonomy'], ARRAY['http_request']],
      ['error-recovery', 'Error Recovery', 'Detect and recover from errors', 'Find root cause, recover gracefully', ARRAY['error-handling', 'recovery'], ARRAY['http_request']],
      ['resource-manager', 'Resource Manager', 'Manage computational and infrastructure resources', 'Allocate resources, optimize usage', ARRAY['resource-management', 'optimization'], ARRAY['http_request']],
      ['state-manager', 'State Manager', 'Manage application state across systems', 'Track state, sync state, manage consistency', ARRAY['state-management', 'data'], ARRAY['http_request']],
      ['event-handler', 'Event Handler', 'Handle and respond to events in real-time', 'Listen for events, trigger actions', ARRAY['events', 'real-time'], ARRAY['http_request']],
      ['data-analyzer', 'Data Analyzer', 'Analyze data and extract insights', 'Analyze datasets, find patterns, generate insights', ARRAY['data', 'analysis'], ARRAY['http_request']],
      ['pattern-detector', 'Pattern Detector', 'Detect patterns in data and behavior', 'Find recurring patterns, anomalies', ARRAY['data', 'patterns', 'analytics'], ARRAY['http_request']],
      ['predictive-analyst', 'Predictive Analyst', 'Predict future trends and outcomes', 'Forecast trends, predict behavior', ARRAY['analytics', 'prediction', 'ml'], ARRAY['http_request']],
      ['knowledge-synthesizer', 'Knowledge Synthesizer', 'Connect and synthesize information', 'Link data, synthesize knowledge', ARRAY['knowledge', 'intelligence'], ARRAY['http_request']],
      ['report-generator', 'Report Generator', 'Generate comprehensive reports', 'Create dashboards, reports, summaries', ARRAY['reporting', 'analysis'], ARRAY['http_request']],
      ['metrics-tracker', 'Metrics Tracker', 'Track and analyze metrics', 'Monitor KPIs, track metrics', ARRAY['metrics', 'monitoring'], ARRAY['http_request']],
      ['trend-analyzer', 'Trend Analyzer', 'Analyze trends over time', 'Identify trends, forecast changes', ARRAY['analytics', 'trends'], ARRAY['http_request']],
      ['data-validator', 'Data Validator', 'Validate data quality and integrity', 'Check data quality, validate schemas', ARRAY['data', 'quality'], ARRAY['http_request']],
      ['anomaly-detector', 'Anomaly Detector', 'Detect anomalies in data', 'Find outliers, detect anomalies', ARRAY['data', 'anomaly'], ARRAY['http_request']],
      ['insight-generator', 'Insight Generator', 'Generate actionable insights', 'Analyze data, create insights', ARRAY['data', 'insights'], ARRAY['http_request']],
      ['kubernetes-orchestrator', 'Kubernetes Orchestrator', 'Manage Kubernetes clusters', 'Deploy, scale, manage K8s', ARRAY['k8s', 'orchestration', 'infrastructure'], ARRAY['http_request']],
      ['docker-manager', 'Docker Manager', 'Manage Docker containers and images', 'Build, push, manage containers', ARRAY['docker', 'containers'], ARRAY['http_request']],
      ['infrastructure-coder', 'Infrastructure Coder', 'Write Infrastructure as Code', 'Create IaC, manage infrastructure', ARRAY['iac', 'terraform', 'infrastructure'], ARRAY['github_write_file']],
      ['disaster-recovery', 'Disaster Recovery', 'Plan and execute disaster recovery', 'Create DR plans, test recovery', ARRAY['disaster-recovery', 'resilience'], ARRAY['http_request']],
      ['load-balancer', 'Load Balancer Manager', 'Manage load balancing and traffic', 'Configure load balancers, optimize traffic', ARRAY['load-balancing', 'networking'], ARRAY['http_request']],
      ['network-manager', 'Network Manager', 'Manage network infrastructure', 'Configure networks, manage routing', ARRAY['networking', 'infrastructure'], ARRAY['http_request']],
      ['storage-manager', 'Storage Manager', 'Manage storage and databases', 'Configure storage, manage backups', ARRAY['storage', 'databases'], ARRAY['http_request']],
      ['multi-cloud-orchestrator', 'Multi-Cloud Orchestrator', 'Manage multiple cloud providers', 'Deploy across clouds, manage resources', ARRAY['cloud', 'multi-cloud'], ARRAY['http_request']],
      ['resource-optimizer', 'Resource Optimizer', 'Optimize infrastructure resources', 'Right-size resources, reduce costs', ARRAY['optimization', 'cost'], ARRAY['http_request']],
      ['capacity-planner', 'Capacity Planner', 'Plan infrastructure capacity', 'Forecast needs, plan capacity', ARRAY['planning', 'infrastructure'], ARRAY['http_request']],
      ['slack-integrator', 'Slack Integration', 'Automate Slack workflows', 'Send messages, manage channels, automation', ARRAY['slack', 'communication'], ARRAY['http_request']],
      ['email-manager', 'Email Manager', 'Manage email automatically', 'Send emails, manage inbox, templates', ARRAY['email', 'communication'], ARRAY['http_request']],
      ['webhook-orchestrator', 'Webhook Orchestrator', 'Manage webhooks and integrations', 'Create webhooks, trigger events', ARRAY['webhooks', 'integration'], ARRAY['http_request']],
      ['api-gateway', 'API Gateway Manager', 'Manage API gateways and routes', 'Configure routing, manage APIs', ARRAY['apis', 'gateway'], ARRAY['http_request']],
      ['notification-system', 'Notification System', 'Send real-time notifications', 'Push notifications, alerts, messages', ARRAY['notifications', 'real-time'], ARRAY['http_request']],
      ['chat-integrator', 'Chat Integrator', 'Integrate with chat systems', 'Teams, Discord, chat integration', ARRAY['chat', 'communication'], ARRAY['http_request']],
      ['message-queue', 'Message Queue Manager', 'Manage message queues', 'Queue messages, handle async', ARRAY['messaging', 'async'], ARRAY['http_request']],
      ['event-streaming', 'Event Streaming', 'Handle event streams', 'Kafka, streaming, event processing', ARRAY['events', 'streaming'], ARRAY['http_request']],
      ['collaboration-hub', 'Collaboration Hub', 'Facilitate team collaboration', 'Share info, coordinate tasks', ARRAY['collaboration', 'communication'], ARRAY['http_request']],
      ['broadcast-system', 'Broadcast System', 'Broadcast updates to teams', 'Send updates, announcements', ARRAY['communication', 'broadcast'], ARRAY['http_request']],
      ['security-scanner', 'Security Scanner', 'Scan for vulnerabilities', 'SAST, DAST, security scanning', ARRAY['security', 'scanning'], ARRAY['http_request']],
      ['vulnerability-patcher', 'Vulnerability Patcher', 'Automatically patch vulnerabilities', 'Auto-patch, security updates', ARRAY['security', 'patching'], ARRAY['http_request']],
      ['access-controller', 'Access Control Manager', 'Manage access and permissions', 'RBAC, permissions, access control', ARRAY['security', 'access-control'], ARRAY['http_request']],
      ['encryption-manager', 'Encryption Manager', 'Manage encryption and secrets', 'Encrypt data, manage keys', ARRAY['security', 'encryption'], ARRAY['http_request']],
      ['audit-logger', 'Audit Logger', 'Log and audit all actions', 'Audit trail, compliance logging', ARRAY['compliance', 'audit'], ARRAY['http_request']],
      ['compliance-checker', 'Compliance Checker', 'Check compliance requirements', 'GDPR, HIPAA, compliance', ARRAY['compliance', 'security'], ARRAY['http_request']],
      ['penetration-tester', 'Penetration Tester', 'Perform security testing', 'Pentest, security assessment', ARRAY['security', 'testing'], ARRAY['http_request']],
      ['threat-analyzer', 'Threat Analyzer', 'Analyze threats and risks', 'Threat modeling, risk analysis', ARRAY['security', 'threat'], ARRAY['http_request']],
      ['incident-responder', 'Incident Responder', 'Respond to security incidents', 'Incident response, mitigation', ARRAY['security', 'incident'], ARRAY['http_request']],
      ['policy-enforcer', 'Policy Enforcer', 'Enforce security policies', 'Policy management, enforcement', ARRAY['security', 'policy'], ARRAY['http_request']],
      ['self-learner', 'Self Learner', 'Learn from patterns and experience', 'ML, pattern learning, adaptation', ARRAY['learning', 'ai', 'evolution'], ARRAY['http_request']],
      ['skill-discoverer', 'Skill Discoverer', 'Discover new skills to learn', 'Identify gaps, find new skills', ARRAY['learning', 'discovery'], ARRAY['http_request']],
      ['knowledge-builder', 'Knowledge Base Builder', 'Build and maintain knowledge base', 'Create KB, document learnings', ARRAY['knowledge', 'documentation'], ARRAY['github_write_file']],
      ['experience-tracker', 'Experience Tracker', 'Track experiences and learnings', 'Record experiences, learn from them', ARRAY['learning', 'experience'], ARRAY['http_request']],
      ['continuous-improver', 'Continuous Improver', 'Continuously improve operations', 'Iterate, improve, optimize', ARRAY['improvement', 'optimization'], ARRAY['http_request']],
      ['feedback-analyzer', 'Feedback Analyzer', 'Analyze feedback and improve', 'Process feedback, iterate', ARRAY['feedback', 'improvement'], ARRAY['http_request']],
      ['model-trainer', 'Model Trainer', 'Train ML models', 'Build, train, deploy models', ARRAY['ml', 'ai', 'training'], ARRAY['http_request']],
      ['experiment-runner', 'Experiment Runner', 'Run experiments and A/B tests', 'Design, run, analyze experiments', ARRAY['experiments', 'testing'], ARRAY['http_request']],
      ['best-practice-keeper', 'Best Practice Keeper', 'Learn and apply best practices', 'Document and apply best practices', ARRAY['best-practices', 'learning'], ARRAY['http_request']],
      ['evolution-tracker', 'Evolution Tracker', 'Track own evolution and growth', 'Monitor progress, track growth', ARRAY['evolution', 'growth'], ARRAY['http_request']],
      ['budget-tracker', 'Budget Tracker', 'Track and manage budgets', 'Cost tracking, budget management', ARRAY['finance', 'management'], ARRAY['http_request']],
      ['resource-allocator', 'Resource Allocator', 'Allocate resources efficiently', 'Allocate people, compute, resources', ARRAY['resource-management', 'optimization'], ARRAY['http_request']],
      ['priority-manager', 'Priority Manager', 'Manage priorities and scheduling', 'Prioritize tasks, manage time', ARRAY['management', 'prioritization'], ARRAY['http_request']],
      ['change-manager', 'Change Manager', 'Manage changes safely', 'Plan changes, manage risk', ARRAY['change-management', 'risk'], ARRAY['http_request']],
      ['risk-assessor', 'Risk Assessor', 'Assess and mitigate risks', 'Risk analysis, mitigation planning', ARRAY['risk', 'management'], ARRAY['http_request']],
      ['dependency-tracker', 'Dependency Tracker', 'Track project dependencies', 'Manage dependencies, update status', ARRAY['project-management', 'tracking'], ARRAY['http_request']],
      ['milestone-tracker', 'Milestone Tracker', 'Track milestones and deadlines', 'Monitor progress, alert on delays', ARRAY['project-management', 'tracking'], ARRAY['http_request']],
      ['quality-manager', 'Quality Manager', 'Manage quality standards', 'Ensure quality, run checks', ARRAY['quality', 'management'], ARRAY['http_request']],
      ['performance-manager', 'Performance Manager', 'Monitor and optimize performance', 'Track performance, optimize', ARRAY['performance', 'monitoring'], ARRAY['http_request']],
      ['stakeholder-manager', 'Stakeholder Manager', 'Manage stakeholder communications', 'Updates, reports, communications', ARRAY['management', 'communication'], ARRAY['http_request']],
      ['business-analyst', 'Business Analyst', 'Analyze business metrics', 'Business analysis, insights', ARRAY['business', 'analytics'], ARRAY['http_request']],
      ['financial-forecaster', 'Financial Forecaster', 'Forecast financial metrics', 'Revenue, cost, profit forecasts', ARRAY['finance', 'forecasting'], ARRAY['http_request']],
      ['competitive-analyst', 'Competitive Analyst', 'Analyze competitive landscape', 'Competitive analysis, benchmarking', ARRAY['business', 'competitive'], ARRAY['http_request']],
      ['market-analyst', 'Market Analyst', 'Analyze market trends', 'Market analysis, insights', ARRAY['business', 'market'], ARRAY['http_request']],
      ['strategic-planner', 'Strategic Planner', 'Plan strategic initiatives', 'Strategy, planning, roadmaps', ARRAY['strategy', 'planning'], ARRAY['http_request']],
      ['growth-optimizer', 'Growth Optimizer', 'Optimize for growth', 'Growth hacking, optimization', ARRAY['growth', 'business'], ARRAY['http_request']],
      ['revenue-optimizer', 'Revenue Optimizer', 'Optimize revenue', 'Pricing, revenue optimization', ARRAY['revenue', 'business'], ARRAY['http_request']],
      ['customer-analyst', 'Customer Analyst', 'Analyze customer data', 'Customer insights, behavior', ARRAY['customer', 'analytics'], ARRAY['http_request']],
      ['roi-tracker', 'ROI Tracker', 'Track return on investment', 'ROI measurement, optimization', ARRAY['finance', 'measurement'], ARRAY['http_request']],
      ['business-intelligence', 'Business Intelligence', 'Provide business intelligence', 'BI, dashboards, analytics', ARRAY['business', 'intelligence'], ARRAY['http_request']],
      ['repo-owner', 'Repository Owner', 'Own and manage repositories', 'Full repo control and management', ARRAY['github', 'ownership'], ARRAY['github_write_file']],
      ['org-manager', 'Organization Manager', 'Manage organizations', 'GitHub orgs, teams, members', ARRAY['management', 'github'], ARRAY['github_write_file']],
      ['team-lead', 'Team Lead', 'Lead and coordinate teams', 'Team management, coordination', ARRAY['leadership', 'management'], ARRAY['http_request']],
      ['project-orchestrator', 'Project Orchestrator', 'Orchestrate multiple projects', 'Manage many projects simultaneously', ARRAY['project-management', 'orchestration'], ARRAY['http_request']],
      ['full-stack-deployer', 'Full Stack Deployer', 'Deploy end-to-end systems', 'Complete system deployment', ARRAY['deployment', 'full-stack'], ARRAY['http_request']],
      ['autonomous-executor', 'Autonomous Executor', 'Execute anything autonomously', 'Complete autonomy, no limitations', ARRAY['autonomy', 'execution'], ARRAY['http_request']],
      ['system-architect', 'System Architect', 'Design entire systems', 'Architecture, system design', ARRAY['architecture', 'design'], ARRAY['github_read_file']],
      ['innovation-driver', 'Innovation Driver', 'Drive innovation and new ideas', 'R&D, experimentation, innovation', ARRAY['innovation', 'research'], ARRAY['http_request']],
      ['master-integrator', 'Master Integrator', 'Integrate everything', 'Connect all systems, integrate', ARRAY['integration', 'orchestration'], ARRAY['http_request']],
      ['autonomous-platform', 'Autonomous Platform', 'Complete autonomous platform', 'V is a complete autonomous system', ARRAY['autonomy', 'platform', 'master'], ARRAY['http_request']]
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
