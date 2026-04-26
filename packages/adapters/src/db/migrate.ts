import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

async function main() {
  const connectionString = process.env.DATABASE_URL || "postgresql://workflow:workflow@localhost:5432/workflow_jk";
  const client = new pg.Client({ connectionString });
  await client.connect();
  const db = drizzle(client, { schema });
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY,
      name VARCHAR NOT NULL,
      slug VARCHAR NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email VARCHAR NOT NULL UNIQUE,
      name VARCHAR NOT NULL,
      password_hash VARCHAR NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS organization_members (
      user_id UUID NOT NULL REFERENCES users(id),
      organization_id UUID NOT NULL REFERENCES organizations(id),
      role VARCHAR NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, organization_id)
    );
    
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      organization_id UUID NOT NULL REFERENCES organizations(id),
      role VARCHAR NOT NULL,
      token VARCHAR NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key_hash VARCHAR PRIMARY KEY,
      result_json JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id),
      title VARCHAR NOT NULL,
      raw_idea TEXT NOT NULL,
      business_goal TEXT NOT NULL,
      constraints JSONB NOT NULL,
      assumptions JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS workflows (
      id UUID PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES projects(id),
      organization_id UUID NOT NULL REFERENCES organizations(id),
      state VARCHAR NOT NULL,
      current_stage VARCHAR NOT NULL,
      current_agent VARCHAR,
      artifact_ids JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS artifacts (
      id UUID PRIMARY KEY,
      project_id UUID NOT NULL,
      organization_id UUID NOT NULL REFERENCES organizations(id),
      workflow_run_id UUID NOT NULL,
      type VARCHAR NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      content JSONB NOT NULL,
      schema_version VARCHAR NOT NULL,
      created_by VARCHAR,
      summary TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS artifacts_project_type_idx ON artifacts(project_id, type);
    CREATE INDEX IF NOT EXISTS artifacts_organization_idx ON artifacts(organization_id);
    
    CREATE TABLE IF NOT EXISTS approvals (
      id UUID PRIMARY KEY,
      workflow_run_id UUID NOT NULL,
      organization_id UUID NOT NULL REFERENCES organizations(id),
      artifact_type VARCHAR NOT NULL,
      decision VARCHAR NOT NULL,
      reviewer VARCHAR NOT NULL,
      comment TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS approvals_workflow_idx ON approvals(workflow_run_id);
    
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY,
      project_id UUID NOT NULL,
      organization_id UUID NOT NULL REFERENCES organizations(id),
      action VARCHAR NOT NULL,
      actor VARCHAR NOT NULL,
      resource_type VARCHAR NOT NULL,
      resource_id VARCHAR NOT NULL,
      details JSONB,
      session_id UUID,
      client_ip VARCHAR,
      previous_hash VARCHAR,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS audit_logs_project_idx ON audit_logs(project_id);
    CREATE INDEX IF NOT EXISTS audit_logs_organization_idx ON audit_logs(organization_id);
  `);
  
  console.log("Migration complete");
  await client.end();
}

main().catch(console.error);