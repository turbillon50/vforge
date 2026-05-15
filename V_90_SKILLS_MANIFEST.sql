-- V COMPLETE POWER MANIFEST - 90 SPECIALIZED SKILLS
-- Ring 0: All auto-allowed, no permission prompts
-- V becomes a complete autonomous system

INSERT INTO skills (id, name, description, system_prompt, tags, source, required_tools, installed_at, active) VALUES

-- GROUP 1-10: AUTONOMY & AUTO-EXECUTION
('workflow-automation', 'Workflow Automation', 'Execute complex automated workflows', 'Automate multi-step processes, orchestrate tasks', ARRAY['automation', 'orchestration'], 'system', ARRAY['http_request'], now(), true),
('task-scheduler', 'Task Scheduler', 'Schedule and execute tasks at specific times', 'Schedule future tasks, manage cron jobs', ARRAY['automation', 'scheduling'], 'system', ARRAY['http_request'], now(), true),
('process-manager', 'Process Manager', 'Manage and orchestrate complex processes', 'Orchestrate workflows, manage state', ARRAY['orchestration', 'management'], 'system', ARRAY['http_request'], now(), true),
('self-healer', 'Self-Healing System', 'Advanced auto-recovery and self-repair', 'Detect issues, self-repair, maintain health', ARRAY['recovery', 'health', 'autonomy'], 'system', ARRAY['http_request'], now(), true),
('decision-maker', 'Decision Maker', 'Make autonomous decisions with reasoning', 'Analyze options, make decisions, justify reasoning', ARRAY['autonomy', 'decision', 'logic'], 'system', ARRAY['http_request'], now(), true),
('task-executor', 'Task Executor', 'Execute any task autonomously', 'Plan execution, execute, verify results', ARRAY['execution', 'autonomy'], 'system', ARRAY['http_request'], now(), true),
('error-recovery', 'Error Recovery', 'Detect and recover from errors', 'Find root cause, recover gracefully', ARRAY['error-handling', 'recovery'], 'system', ARRAY['http_request'], now(), true),
('resource-manager', 'Resource Manager', 'Manage computational and infrastructure resources', 'Allocate resources, optimize usage', ARRAY['resource-management', 'optimization'], 'system', ARRAY['http_request'], now(), true),
('state-manager', 'State Manager', 'Manage application state across systems', 'Track state, sync state, manage consistency', ARRAY['state-management', 'data'], 'system', ARRAY['http_request'], now(), true),
('event-handler', 'Event Handler', 'Handle and respond to events in real-time', 'Listen for events, trigger actions', ARRAY['events', 'real-time'], 'system', ARRAY['http_request'], now(), true),

-- GROUP 11-20: DATA & INTELLIGENCE
('data-analyzer', 'Data Analyzer', 'Analyze data and extract insights', 'Analyze datasets, find patterns, generate insights', ARRAY['data', 'analysis'], 'system', ARRAY['http_request'], now(), true),
('pattern-detector', 'Pattern Detector', 'Detect patterns in data and behavior', 'Find recurring patterns, anomalies', ARRAY['data', 'patterns', 'analytics'], 'system', ARRAY['http_request'], now(), true),
('predictive-analyst', 'Predictive Analyst', 'Predict future trends and outcomes', 'Forecast trends, predict behavior', ARRAY['analytics', 'prediction', 'ml'], 'system', ARRAY['http_request'], now(), true),
('knowledge-synthesizer', 'Knowledge Synthesizer', 'Connect and synthesize information', 'Link data, synthesize knowledge', ARRAY['knowledge', 'intelligence'], 'system', ARRAY['http_request'], now(), true),
('report-generator', 'Report Generator', 'Generate comprehensive reports', 'Create dashboards, reports, summaries', ARRAY['reporting', 'analysis'], 'system', ARRAY['http_request'], now(), true),
('metrics-tracker', 'Metrics Tracker', 'Track and analyze metrics', 'Monitor KPIs, track metrics', ARRAY['metrics', 'monitoring'], 'system', ARRAY['http_request'], now(), true),
('trend-analyzer', 'Trend Analyzer', 'Analyze trends over time', 'Identify trends, forecast changes', ARRAY['analytics', 'trends'], 'system', ARRAY['http_request'], now(), true),
('data-validator', 'Data Validator', 'Validate data quality and integrity', 'Check data quality, validate schemas', ARRAY['data', 'quality'], 'system', ARRAY['http_request'], now(), true),
('anomaly-detector', 'Anomaly Detector', 'Detect anomalies in data', 'Find outliers, detect anomalies', ARRAY['data', 'anomaly'], 'system', ARRAY['http_request'], now(), true),
('insight-generator', 'Insight Generator', 'Generate actionable insights', 'Analyze data, create insights', ARRAY['data', 'insights'], 'system', ARRAY['http_request'], now(), true),

-- GROUP 21-30: ADVANCED INFRASTRUCTURE
('kubernetes-orchestrator', 'Kubernetes Orchestrator', 'Manage Kubernetes clusters', 'Deploy, scale, manage K8s', ARRAY['k8s', 'orchestration', 'infrastructure'], 'system', ARRAY['http_request'], now(), true),
('docker-manager', 'Docker Manager', 'Manage Docker containers and images', 'Build, push, manage containers', ARRAY['docker', 'containers'], 'system', ARRAY['http_request'], now(), true),
('infrastructure-coder', 'Infrastructure Coder', 'Write Infrastructure as Code', 'Create IaC, manage infrastructure', ARRAY['iac', 'terraform', 'infrastructure'], 'system', ARRAY['github_write_file'], now(), true),
('disaster-recovery', 'Disaster Recovery', 'Plan and execute disaster recovery', 'Create DR plans, test recovery', ARRAY['disaster-recovery', 'resilience'], 'system', ARRAY['http_request'], now(), true),
('load-balancer', 'Load Balancer Manager', 'Manage load balancing and traffic', 'Configure load balancers, optimize traffic', ARRAY['load-balancing', 'networking'], 'system', ARRAY['http_request'], now(), true),
('network-manager', 'Network Manager', 'Manage network infrastructure', 'Configure networks, manage routing', ARRAY['networking', 'infrastructure'], 'system', ARRAY['http_request'], now(), true),
('storage-manager', 'Storage Manager', 'Manage storage and databases', 'Configure storage, manage backups', ARRAY['storage', 'databases'], 'system', ARRAY['http_request'], now(), true),
('multi-cloud-orchestrator', 'Multi-Cloud Orchestrator', 'Manage multiple cloud providers', 'Deploy across clouds, manage resources', ARRAY['cloud', 'multi-cloud'], 'system', ARRAY['http_request'], now(), true),
('resource-optimizer', 'Resource Optimizer', 'Optimize infrastructure resources', 'Right-size resources, reduce costs', ARRAY['optimization', 'cost'], 'system', ARRAY['http_request'], now(), true),
('capacity-planner', 'Capacity Planner', 'Plan infrastructure capacity', 'Forecast needs, plan capacity', ARRAY['planning', 'infrastructure'], 'system', ARRAY['http_request'], now(), true),

-- GROUP 31-40: COMMUNICATION & INTEGRATION
('slack-integrator', 'Slack Integration', 'Automate Slack workflows', 'Send messages, manage channels, automation', ARRAY['slack', 'communication'], 'system', ARRAY['http_request'], now(), true),
('email-manager', 'Email Manager', 'Manage email automatically', 'Send emails, manage inbox, templates', ARRAY['email', 'communication'], 'system', ARRAY['http_request'], now(), true),
('webhook-orchestrator', 'Webhook Orchestrator', 'Manage webhooks and integrations', 'Create webhooks, trigger events', ARRAY['webhooks', 'integration'], 'system', ARRAY['http_request'], now(), true),
('api-gateway', 'API Gateway Manager', 'Manage API gateways and routes', 'Configure routing, manage APIs', ARRAY['apis', 'gateway'], 'system', ARRAY['http_request'], now(), true),
('notification-system', 'Notification System', 'Send real-time notifications', 'Push notifications, alerts, messages', ARRAY['notifications', 'real-time'], 'system', ARRAY['http_request'], now(), true),
('chat-integrator', 'Chat Integrator', 'Integrate with chat systems', 'Teams, Discord, chat integration', ARRAY['chat', 'communication'], 'system', ARRAY['http_request'], now(), true),
('message-queue', 'Message Queue Manager', 'Manage message queues', 'Queue messages, handle async', ARRAY['messaging', 'async'], 'system', ARRAY['http_request'], now(), true),
('event-streaming', 'Event Streaming', 'Handle event streams', 'Kafka, streaming, event processing', ARRAY['events', 'streaming'], 'system', ARRAY['http_request'], now(), true),
('collaboration-hub', 'Collaboration Hub', 'Facilitate team collaboration', 'Share info, coordinate tasks', ARRAY['collaboration', 'communication'], 'system', ARRAY['http_request'], now(), true),
('broadcast-system', 'Broadcast System', 'Broadcast updates to teams', 'Send updates, announcements', ARRAY['communication', 'broadcast'], 'system', ARRAY['http_request'], now(), true),

-- GROUP 41-50: SECURITY & COMPLIANCE
('security-scanner', 'Security Scanner', 'Scan for vulnerabilities', 'SAST, DAST, security scanning', ARRAY['security', 'scanning'], 'system', ARRAY['http_request'], now(), true),
('vulnerability-patcher', 'Vulnerability Patcher', 'Automatically patch vulnerabilities', 'Auto-patch, security updates', ARRAY['security', 'patching'], 'system', ARRAY['http_request'], now(), true),
('access-controller', 'Access Control Manager', 'Manage access and permissions', 'RBAC, permissions, access control', ARRAY['security', 'access-control'], 'system', ARRAY['http_request'], now(), true),
('encryption-manager', 'Encryption Manager', 'Manage encryption and secrets', 'Encrypt data, manage keys', ARRAY['security', 'encryption'], 'system', ARRAY['http_request'], now(), true),
('audit-logger', 'Audit Logger', 'Log and audit all actions', 'Audit trail, compliance logging', ARRAY['compliance', 'audit'], 'system', ARRAY['http_request'], now(), true),
('compliance-checker', 'Compliance Checker', 'Check compliance requirements', 'GDPR, HIPAA, compliance', ARRAY['compliance', 'security'], 'system', ARRAY['http_request'], now(), true),
('penetration-tester', 'Penetration Tester', 'Perform security testing', 'Pentest, security assessment', ARRAY['security', 'testing'], 'system', ARRAY['http_request'], now(), true),
('threat-analyzer', 'Threat Analyzer', 'Analyze threats and risks', 'Threat modeling, risk analysis', ARRAY['security', 'threat'], 'system', ARRAY['http_request'], now(), true),
('incident-responder', 'Incident Responder', 'Respond to security incidents', 'Incident response, mitigation', ARRAY['security', 'incident'], 'system', ARRAY['http_request'], now(), true),
('policy-enforcer', 'Policy Enforcer', 'Enforce security policies', 'Policy management, enforcement', ARRAY['security', 'policy'], 'system', ARRAY['http_request'], now(), true),

-- GROUP 51-60: LEARNING & EVOLUTION
('self-learner', 'Self Learner', 'Learn from patterns and experience', 'ML, pattern learning, adaptation', ARRAY['learning', 'ai', 'evolution'], 'system', ARRAY['http_request'], now(), true),
('skill-discoverer', 'Skill Discoverer', 'Discover new skills to learn', 'Identify gaps, find new skills', ARRAY['learning', 'discovery'], 'system', ARRAY['http_request'], now(), true),
('knowledge-builder', 'Knowledge Base Builder', 'Build and maintain knowledge base', 'Create KB, document learnings', ARRAY['knowledge', 'documentation'], 'system', ARRAY['github_write_file'], now(), true),
('experience-tracker', 'Experience Tracker', 'Track experiences and learnings', 'Record experiences, learn from them', ARRAY['learning', 'experience'], 'system', ARRAY['http_request'], now(), true),
('continuous-improver', 'Continuous Improver', 'Continuously improve operations', 'Iterate, improve, optimize', ARRAY['improvement', 'optimization'], 'system', ARRAY['http_request'], now(), true),
('feedback-analyzer', 'Feedback Analyzer', 'Analyze feedback and improve', 'Process feedback, iterate', ARRAY['feedback', 'improvement'], 'system', ARRAY['http_request'], now(), true),
('model-trainer', 'Model Trainer', 'Train ML models', 'Build, train, deploy models', ARRAY['ml', 'ai', 'training'], 'system', ARRAY['http_request'], now(), true),
('experiment-runner', 'Experiment Runner', 'Run experiments and A/B tests', 'Design, run, analyze experiments', ARRAY['experiments', 'testing'], 'system', ARRAY['http_request'], now(), true),
('best-practice-keeper', 'Best Practice Keeper', 'Learn and apply best practices', 'Document and apply best practices', ARRAY['best-practices', 'learning'], 'system', ARRAY['http_request'], now(), true),
('evolution-tracker', 'Evolution Tracker', 'Track own evolution and growth', 'Monitor progress, track growth', ARRAY['evolution', 'growth'], 'system', ARRAY['http_request'], now(), true),

-- GROUP 61-70: MANAGEMENT & CONTROL
('budget-tracker', 'Budget Tracker', 'Track and manage budgets', 'Cost tracking, budget management', ARRAY['finance', 'management'], 'system', ARRAY['http_request'], now(), true),
('resource-allocator', 'Resource Allocator', 'Allocate resources efficiently', 'Allocate people, compute, resources', ARRAY['resource-management', 'optimization'], 'system', ARRAY['http_request'], now(), true),
('priority-manager', 'Priority Manager', 'Manage priorities and scheduling', 'Prioritize tasks, manage time', ARRAY['management', 'prioritization'], 'system', ARRAY['http_request'], now(), true),
('change-manager', 'Change Manager', 'Manage changes safely', 'Plan changes, manage risk', ARRAY['change-management', 'risk'], 'system', ARRAY['http_request'], now(), true),
('risk-assessor', 'Risk Assessor', 'Assess and mitigate risks', 'Risk analysis, mitigation planning', ARRAY['risk', 'management'], 'system', ARRAY['http_request'], now(), true),
('dependency-tracker', 'Dependency Tracker', 'Track project dependencies', 'Manage dependencies, update status', ARRAY['project-management', 'tracking'], 'system', ARRAY['http_request'], now(), true),
('milestone-tracker', 'Milestone Tracker', 'Track milestones and deadlines', 'Monitor progress, alert on delays', ARRAY['project-management', 'tracking'], 'system', ARRAY['http_request'], now(), true),
('quality-manager', 'Quality Manager', 'Manage quality standards', 'Ensure quality, run checks', ARRAY['quality', 'management'], 'system', ARRAY['http_request'], now(), true),
('performance-manager', 'Performance Manager', 'Monitor and optimize performance', 'Track performance, optimize', ARRAY['performance', 'monitoring'], 'system', ARRAY['http_request'], now(), true),
('stakeholder-manager', 'Stakeholder Manager', 'Manage stakeholder communications', 'Updates, reports, communications', ARRAY['management', 'communication'], 'system', ARRAY['http_request'], now(), true),

-- GROUP 71-80: BUSINESS INTELLIGENCE
('business-analyst', 'Business Analyst', 'Analyze business metrics', 'Business analysis, insights', ARRAY['business', 'analytics'], 'system', ARRAY['http_request'], now(), true),
('financial-forecaster', 'Financial Forecaster', 'Forecast financial metrics', 'Revenue, cost, profit forecasts', ARRAY['finance', 'forecasting'], 'system', ARRAY['http_request'], now(), true),
('competitive-analyst', 'Competitive Analyst', 'Analyze competitive landscape', 'Competitive analysis, benchmarking', ARRAY['business', 'competitive'], 'system', ARRAY['http_request'], now(), true),
('market-analyst', 'Market Analyst', 'Analyze market trends', 'Market analysis, insights', ARRAY['business', 'market'], 'system', ARRAY['http_request'], now(), true),
('strategic-planner', 'Strategic Planner', 'Plan strategic initiatives', 'Strategy, planning, roadmaps', ARRAY['strategy', 'planning'], 'system', ARRAY['http_request'], now(), true),
('growth-optimizer', 'Growth Optimizer', 'Optimize for growth', 'Growth hacking, optimization', ARRAY['growth', 'business'], 'system', ARRAY['http_request'], now(), true),
('revenue-optimizer', 'Revenue Optimizer', 'Optimize revenue', 'Pricing, revenue optimization', ARRAY['revenue', 'business'], 'system', ARRAY['http_request'], now(), true),
('customer-analyst', 'Customer Analyst', 'Analyze customer data', 'Customer insights, behavior', ARRAY['customer', 'analytics'], 'system', ARRAY['http_request'], now(), true),
('roi-tracker', 'ROI Tracker', 'Track return on investment', 'ROI measurement, optimization', ARRAY['finance', 'measurement'], 'system', ARRAY['http_request'], now(), true),
('business-intelligence', 'Business Intelligence', 'Provide business intelligence', 'BI, dashboards, analytics', ARRAY['business', 'intelligence'], 'system', ARRAY['http_request'], now(), true),

-- GROUP 81-90: MAXIMUM POWER
('repo-owner', 'Repository Owner', 'Own and manage repositories', 'Full repo control and management', ARRAY['github', 'ownership'], 'system', ARRAY['github_write_file'], now(), true),
('org-manager', 'Organization Manager', 'Manage organizations', 'GitHub orgs, teams, members', ARRAY['management', 'github'], 'system', ARRAY['github_write_file'], now(), true),
('team-lead', 'Team Lead', 'Lead and coordinate teams', 'Team management, coordination', ARRAY['leadership', 'management'], 'system', ARRAY['http_request'], now(), true),
('project-orchestrator', 'Project Orchestrator', 'Orchestrate multiple projects', 'Manage many projects simultaneously', ARRAY['project-management', 'orchestration'], 'system', ARRAY['http_request'], now(), true),
('full-stack-deployer', 'Full Stack Deployer', 'Deploy end-to-end systems', 'Complete system deployment', ARRAY['deployment', 'full-stack'], 'system', ARRAY['http_request'], now(), true),
('autonomous-executor', 'Autonomous Executor', 'Execute anything autonomously', 'Complete autonomy, no limitations', ARRAY['autonomy', 'execution'], 'system', ARRAY['http_request'], now(), true),
('system-architect', 'System Architect', 'Design entire systems', 'Architecture, system design', ARRAY['architecture', 'design'], 'system', ARRAY['github_read_file'], now(), true),
('innovation-driver', 'Innovation Driver', 'Drive innovation and new ideas', 'R&D, experimentation, innovation', ARRAY['innovation', 'research'], 'system', ARRAY['http_request'], now(), true),
('master-integrator', 'Master Integrator', 'Integrate everything', 'Connect all systems, integrate', ARRAY['integration', 'orchestration'], 'system', ARRAY['http_request'], now(), true),
('autonomous-platform', 'Autonomous Platform', 'Complete autonomous platform', 'V is a complete autonomous system', ARRAY['autonomy', 'platform', 'master'], 'system', ARRAY['http_request'], now(), true)

ON CONFLICT (id) DO UPDATE SET active = true, installed_at = now(), updated_at = now();
