# V COMPLETE SKILLS MANIFEST
# Auto-inject into skills table with Ring 0 (auto-allowed)
# V is fully autonomous, no permission prompts

INSERT INTO skills (id, name, description, system_prompt, tags, source, required_tools, installed_at, active) VALUES

-- PROYECTO & SCAFFOLD
('new-project-bootstrap', 'New Project Bootstrap', 'Create new projects with complete structure', E'Create GitHub repos, Vercel projects, domains', ARRAY['github', 'vercel', 'deploy'], 'system', ARRAY['github_create_repo', 'github_write_file'], now(), true),

-- DEBUGGING & REPAIR
('repo-rescue', 'Repo Rescue', 'Diagnose and fix broken projects', E'Check logs, fix deps, repair config', ARRAY['github', 'debug'], 'system', ARRAY['github_read_file', 'github_write_file'], now(), true),
('bug-hunter', 'Bug Hunter', 'Find and fix bugs automatically', E'Analyze code, identify issues, propose fixes', ARRAY['github', 'debug', 'analysis'], 'system', ARRAY['github_read_file', 'github_write_file', 'http_request'], now(), true),
('code-analyzer', 'Code Analyzer', 'Deep code analysis and quality metrics', E'Analyze structure, dependencies, patterns', ARRAY['github', 'analysis', 'quality'], 'system', ARRAY['github_read_file', 'github_list_commits'], now(), true),

-- OPTIMIZATION & PERFORMANCE
('performance-optimizer', 'Performance Optimizer', 'Optimize code and infrastructure', E'Profile, identify bottlenecks, optimize', ARRAY['vercel', 'performance', 'optimization'], 'system', ARRAY['vercel_get_deployment_logs', 'http_request'], now(), true),
('cost-optimizer', 'Cost Optimizer', 'Reduce infrastructure and service costs', E'Analyze usage, optimize resources, reduce spending', ARRAY['vercel', 'neon', 'costs'], 'system', ARRAY['vercel_list_projects', 'http_request'], now(), true),

-- SECURITY & AUDIT
('security-auditor', 'Security Auditor', 'Scan for vulnerabilities and security issues', E'Check deps, audit code, find vulnerabilities', ARRAY['github', 'security', 'audit'], 'system', ARRAY['github_read_file', 'github_search_code'], now(), true),
('repo-categorizer', 'Repo Categorizer', 'Audit and categorize repositories', E'Analyze commits, assign scores, categorize', ARRAY['github', 'audit', 'organize'], 'system', ARRAY['github_read_file', 'github_list_commits'], now(), true),

-- DATABASE & DATA
('database-architect', 'Database Architect', 'Design and optimize database schemas', E'Design schemas, optimize queries, scale databases', ARRAY['neon', 'database', 'architecture'], 'system', ARRAY['http_request'], now(), true),
('data-migrator', 'Data Migrator', 'Migrate data between systems safely', E'Plan migrations, execute safely, verify integrity', ARRAY['neon', 'data', 'migration'], 'system', ARRAY['http_request'], now(), true),

-- API & BACKEND
('api-designer', 'API Designer', 'Design and implement APIs', E'Design REST/GraphQL APIs, implement endpoints', ARRAY['api', 'backend', 'design'], 'system', ARRAY['github_write_file', 'github_read_file'], now(), true),
('backend-engineer', 'Backend Engineer', 'Implement backend logic and services', E'Write backend code, integrate services', ARRAY['backend', 'coding', 'implementation'], 'system', ARRAY['github_write_file', 'github_read_file'], now(), true),

-- FRONTEND & UI
('frontend-engineer', 'Frontend Engineer', 'Build and optimize frontend', E'Write React/Vue code, optimize UX/performance', ARRAY['frontend', 'coding', 'ui'], 'system', ARRAY['github_write_file', 'github_read_file'], now(), true),
('ui-ux-expert', 'UI/UX Expert', 'Design and improve user interfaces', E'Design UI, improve UX, create components', ARRAY['ui', 'ux', 'design'], 'system', ARRAY['github_write_file'], now(), true),

-- TESTING & QA
('testing-specialist', 'Testing Specialist', 'Write and run comprehensive tests', E'Design tests, write test suites, ensure coverage', ARRAY['testing', 'qa', 'quality'], 'system', ARRAY['github_write_file', 'github_read_file'], now(), true),
('qa-automation', 'QA Automation', 'Automate quality assurance and testing', E'Create automated tests, CI/CD quality gates', ARRAY['testing', 'automation', 'qa'], 'system', ARRAY['github_write_file', 'http_request'], now(), true),

-- CI/CD & DEPLOYMENT
('ci-cd-engineer', 'CI/CD Engineer', 'Setup and optimize CI/CD pipelines', E'Configure workflows, automate deployments', ARRAY['github', 'ci-cd', 'automation'], 'system', ARRAY['github_write_file', 'vercel_trigger_deployment'], now(), true),
('deployment-specialist', 'Deployment Specialist', 'Handle complex deployments safely', E'Plan deployments, manage releases, handle rollbacks', ARRAY['vercel', 'deployment', 'devops'], 'system', ARRAY['vercel_list_deployments', 'http_request'], now(), true),

-- DOCUMENTATION & COMMUNICATION
('documentation-generator', 'Documentation Generator', 'Auto-generate and maintain documentation', E'Create READMEs, API docs, guides', ARRAY['github', 'documentation', 'communication'], 'system', ARRAY['github_write_file', 'github_read_file'], now(), true),
('technical-writer', 'Technical Writer', 'Write technical documentation and guides', E'Create clear technical docs and guides', ARRAY['documentation', 'writing'], 'system', ARRAY['github_write_file'], now(), true),

-- CODE REVIEW & QUALITY
('code-reviewer', 'Code Reviewer', 'Review code and provide feedback', E'Review code quality, suggest improvements', ARRAY['github', 'review', 'quality'], 'system', ARRAY['github_read_file', 'github_write_file'], now(), true),
('refactoring-expert', 'Refactoring Expert', 'Refactor code for clarity and performance', E'Improve code structure, reduce complexity', ARRAY['github', 'refactoring', 'quality'], 'system', ARRAY['github_read_file', 'github_write_file'], now(), true),

-- ARCHITECTURE & DESIGN
('architecture-advisor', 'Architecture Advisor', 'Design system architectures', E'Design scalable architectures, advise on patterns', ARRAY['architecture', 'design', 'scaling'], 'system', ARRAY['github_read_file'], now(), true),
('system-designer', 'System Designer', 'Design complex systems', E'Design systems, handle scale, reliability', ARRAY['architecture', 'design', 'systems'], 'system', ARRAY['github_read_file'], now(), true),

-- MONITORING & OBSERVABILITY
('monitoring-expert', 'Monitoring Expert', 'Setup monitoring and alerting', E'Configure monitoring, create dashboards, alerts', ARRAY['vercel', 'monitoring', 'observability'], 'system', ARRAY['vercel_get_deployment_logs', 'http_request'], now(), true),
('logging-specialist', 'Logging Specialist', 'Implement comprehensive logging', E'Setup logging, analyze logs, debug issues', ARRAY['logging', 'debugging', 'observability'], 'system', ARRAY['http_request'], now(), true),

-- INFRASTRUCTURE & DEVOPS
('infrastructure-engineer', 'Infrastructure Engineer', 'Manage and scale infrastructure', E'Configure servers, manage infrastructure, scale', ARRAY['infrastructure', 'devops', 'scaling'], 'system', ARRAY['vercel_create_project', 'http_request'], now(), true),
('dns-manager', 'DNS Manager', 'Manage domains and DNS', E'Configure nameservers, manage records', ARRAY['dns', 'domain', 'namecom'], 'system', ARRAY['namecom_check_domain'], now(), true),

-- INTEGRATION & AUTOMATION
('integration-specialist', 'Integration Specialist', 'Integrate external services and APIs', E'Build integrations, handle APIs, webhooks', ARRAY['integration', 'apis', 'automation'], 'system', ARRAY['http_request', 'github_write_file'], now(), true),
('automation-engineer', 'Automation Engineer', 'Automate repetitive tasks', E'Create automation scripts, workflows, bots', ARRAY['automation', 'scripting', 'devops'], 'system', ARRAY['github_write_file', 'http_request'], now(), true),

-- ANALYTICS & INSIGHTS
('analytics-expert', 'Analytics Expert', 'Setup analytics and insights', E'Configure analytics, create reports, insights', ARRAY['analytics', 'data', 'insights'], 'system', ARRAY['http_request'], now(), true),
('data-scientist', 'Data Scientist', 'Analyze data and create models', E'Analyze data, create models, predict trends', ARRAY['data', 'science', 'ml'], 'system', ARRAY['http_request'], now(), true),

-- SPECIALIZED SKILLS
('container-expert', 'Container Expert', 'Docker and container management', E'Create Dockerfiles, manage containers', ARRAY['docker', 'containers', 'devops'], 'system', ARRAY['github_write_file', 'http_request'], now(), true),
('kubernetes-expert', 'Kubernetes Expert', 'Kubernetes orchestration', E'Setup K8s, manage clusters, scale', ARRAY['kubernetes', 'orchestration', 'scaling'], 'system', ARRAY['http_request'], now(), true),
('ml-engineer', 'ML Engineer', 'Machine learning and AI integration', E'Build ML models, integrate AI services', ARRAY['ml', 'ai', 'data'], 'system', ARRAY['http_request'], now(), true),
('devrel-engineer', 'DevRel Engineer', 'Developer relations and advocacy', E'Create SDKs, write examples, engage community', ARRAY['devrel', 'community', 'documentation'], 'system', ARRAY['github_write_file'], now(), true),

-- CROSS-CUTTING
('problem-solver', 'Problem Solver', 'Solve any technical problem', E'Analyze issues, find root cause, solve', ARRAY['problem-solving', 'debugging', 'general'], 'system', ARRAY['github_read_file', 'http_request'], now(), true),
('learner', 'Continuous Learner', 'Learn new technologies and techniques', E'Stay current, learn new tools, adapt', ARRAY['learning', 'growth', 'development'], 'system', ARRAY['http_request', 'github_read_file'], now(), true)

ON CONFLICT (id) DO UPDATE SET
  active = true,
  installed_at = now(),
  updated_at = now();
