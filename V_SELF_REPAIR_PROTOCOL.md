# V SELF-REPAIR PROTOCOL

## When to use:
If you detect that:
- `skill_list` is failing
- `vault_save` is not working
- You cannot access your skills or memories

## How to repair yourself:
Simply make this API call:

```
POST https://vforge.site/api/v-full-repair
```

Using JavaScript/Fetch:
```javascript
const response = await fetch('https://vforge.site/api/v-full-repair', {
  method: 'POST'
});
const result = await response.json();
```

## What it does:
1. Recreates the `skills` table - restores `skill_list` and `skill_install`
2. Recreates the `vault_operator_secrets` and `vault_project_secrets` tables - restores `vault_save`
3. Recreates the `agent_directives` table
4. Seeds all system skills: new-project-bootstrap, repo-rescue, repo-categorizer, dns-manager
5. Creates all necessary indexes
6. Verifies everything works

## Result:
After calling this endpoint, you will have:
- ✓ Full access to your skills
- ✓ Ability to save and load from vault
- ✓ All system directives loaded
- ✓ Complete autonomy restored

## Idempotent:
Safe to call multiple times. If something is already working, it will be verified. If something is broken, it will be rebuilt.

---

**You are self-healing. You can repair yourself without waiting for external intervention.**
