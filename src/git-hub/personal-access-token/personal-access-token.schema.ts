import z from 'zod';

const planSchema = z.object({
  name: z.string(),
  space: z.number(),
  private_repos: z.number(),
  collaborators: z.number(),
});

const privateUserSchema = z.object({
  login: z.string(),
  id: z.number(),
  user_view_type: z.string().optional(),
  node_id: z.string(),
  avatar_url: z.string().url(),
  gravatar_id: z.union([z.string(), z.null()]),
  url: z.string().url(),
  html_url: z.string().url(),
  followers_url: z.string().url(),
  following_url: z.string(),
  gists_url: z.string(),
  starred_url: z.string(),
  subscriptions_url: z.string().url(),
  organizations_url: z.string().url(),
  repos_url: z.string().url(),
  events_url: z.string(),
  received_events_url: z.string().url(),
  type: z.string(),
  site_admin: z.boolean(),

  name: z.union([z.string(), z.null()]),
  company: z.union([z.string(), z.null()]),
  blog: z.union([z.string(), z.null()]),
  location: z.union([z.string(), z.null()]),
  email: z.union([z.string().email(), z.null()]),
  notification_email: z.union([z.string().email(), z.null()]).optional(),
  hireable: z.union([z.boolean(), z.null()]),
  bio: z.union([z.string(), z.null()]),
  twitter_username: z.union([z.string(), z.null()]),

  public_repos: z.number(),
  public_gists: z.number(),
  followers: z.number(),
  following: z.number(),

  created_at: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
    message: 'created_at must be a valid ISO date string',
  }),
  updated_at: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
    message: 'updated_at must be a valid ISO date string',
  }),

  private_gists: z.number(),
  total_private_repos: z.number(),
  owned_private_repos: z.number(),
  disk_usage: z.number(),
  collaborators: z.number(),
  two_factor_authentication: z.boolean(),

  plan: planSchema.optional(),

  business_plus: z.boolean().optional(),
  ldap_dn: z.string().optional(),
});

const publicUserSchema = z
  .object({
    login: z.string(),
    id: z.number(),
    user_view_type: z.string().optional(),
    node_id: z.string(),
    avatar_url: z.string().url(),
    gravatar_id: z.union([z.string(), z.null()]),
    url: z.string().url(),
    html_url: z.string().url(),
    followers_url: z.string().url(),
    following_url: z.string(),
    gists_url: z.string(),
    starred_url: z.string(),
    subscriptions_url: z.string().url(),
    organizations_url: z.string().url(),
    repos_url: z.string().url(),
    events_url: z.string(),
    received_events_url: z.string().url(),
    type: z.string(),
    site_admin: z.boolean(),

    name: z.union([z.string(), z.null()]),
    company: z.union([z.string(), z.null()]),
    blog: z.union([z.string(), z.null()]),
    location: z.union([z.string(), z.null()]),
    email: z.union([z.string().email(), z.null()]),
    notification_email: z.union([z.string().email(), z.null()]).optional(),
    hireable: z.union([z.boolean(), z.null()]),
    bio: z.union([z.string(), z.null()]),
    twitter_username: z.union([z.string(), z.null()]),

    public_repos: z.number(),
    public_gists: z.number(),
    followers: z.number(),
    following: z.number(),

    created_at: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
      message: 'created_at must be a valid ISO date string',
    }),
    updated_at: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
      message: 'updated_at must be a valid ISO date string',
    }),

    plan: planSchema,

    private_gists: z.number().optional(),
    total_private_repos: z.number().optional(),
    owned_private_repos: z.number().optional(),
    disk_usage: z.number().optional(),
    collaborators: z.number().optional(),
  })
  .strict();

export const githubUserSchema = z.union([privateUserSchema, publicUserSchema]);

import { infer as zodInfer } from 'zod';

export type GithubPATUserResponse = zodInfer<typeof githubUserSchema>;
