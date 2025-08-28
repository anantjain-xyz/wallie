import type React from "react";

import { ReactComponent as CancelIcon } from "../assets/icons/cancel.svg";
import { ReactComponent as BacklogIcon } from "../assets/icons/circle-dot.svg";
import { ReactComponent as TodoIcon } from "../assets/icons/circle.svg";
import { ReactComponent as DoneIcon } from "../assets/icons/done.svg";
import { ReactComponent as InProgressIcon } from "../assets/icons/half-circle.svg";
import { ReactComponent as InReviewIcon } from "../assets/icons/three-quarters-cricle.svg";

import { ReactComponent as HighPriorityIcon } from "../assets/icons/signal-strong.svg";
import { ReactComponent as LowPriorityIcon } from "../assets/icons/signal-weak.svg";
import { ReactComponent as MediumPriorityIcon } from "../assets/icons/signal-medium.svg";
import { ReactComponent as NoPriorityIcon } from "../assets/icons/dots.svg";
import { ReactComponent as UrgentPriorityIcon } from "../assets/icons/rounded-claim.svg";

export type Issue = {
  id: string;
  title: string;
  description: string;
  priority: (typeof Priority)[keyof typeof Priority];
  status: (typeof Status)[keyof typeof Status];
  modified: Date;
  created: Date;
  kanbanorder: string;
  creator_id: string;
  workspace_id: string;
  github_repository_id: string | null;
  assignee_id: string | null;
  estimate: number | null;
  external_id: number | null;
  plan: string | null;
  design: string | null;
};

export type Comment = {
  id: string;
  body: string;
  creator_id: string;
  issue_id: string;
  created: Date;
};

export const Priority = {
  NONE: `none`,
  URGENT: `urgent`,
  HIGH: `high`,
  LOW: `low`,
  MEDIUM: `medium`,
} as const;

export type PriorityValue = (typeof Priority)[keyof typeof Priority];

export const PriorityDisplay = {
  [Priority.NONE]: `No Priority`,
  [Priority.URGENT]: `Urgent`,
  [Priority.HIGH]: `High`,
  [Priority.LOW]: `Low`,
  [Priority.MEDIUM]: `Medium`,
};

export const PriorityIcons = {
  [Priority.NONE]: NoPriorityIcon,
  [Priority.URGENT]: UrgentPriorityIcon,
  [Priority.HIGH]: HighPriorityIcon,
  [Priority.MEDIUM]: MediumPriorityIcon,
  [Priority.LOW]: LowPriorityIcon,
};

export const PriorityColors = {
  [Priority.NONE]: `fill-gray-500`,
  [Priority.URGENT]: `fill-orange-600`,
  [Priority.HIGH]: `fill-gray-500`,
  [Priority.MEDIUM]: `fill-gray-500`,
  [Priority.LOW]: `fill-gray-500`,
};

export const PriorityOptions: [
  React.FunctionComponent<React.SVGProps<SVGSVGElement>>,
  PriorityValue,
  string,
][] = [
  [PriorityIcons[Priority.NONE], Priority.NONE, `No priority`],
  [PriorityIcons[Priority.URGENT], Priority.URGENT, `Urgent`],
  [PriorityIcons[Priority.HIGH], Priority.HIGH, `High`],
  [PriorityIcons[Priority.MEDIUM], Priority.MEDIUM, `Medium`],
  [PriorityIcons[Priority.LOW], Priority.LOW, `Low`],
];

export const Status = {
  BACKLOG: `backlog`,
  TODO: `todo`,
  IN_PROGRESS: `in_progress`,
  IN_REVIEW: `in_review`,
  DONE: `done`,
  CANCELED: `canceled`,
} as const;

export type StatusValue = (typeof Status)[keyof typeof Status];

export const StatusDisplay = {
  [Status.BACKLOG]: `Backlog`,
  [Status.TODO]: `To Do`,
  [Status.IN_PROGRESS]: `In Progress`,
  [Status.IN_REVIEW]: `In Review`,
  [Status.DONE]: `Done`,
  [Status.CANCELED]: `Canceled`,
};

export const StatusIcons = {
  [Status.BACKLOG]: BacklogIcon,
  [Status.TODO]: TodoIcon,
  [Status.IN_PROGRESS]: InProgressIcon,
  [Status.IN_REVIEW]: InReviewIcon,
  [Status.DONE]: DoneIcon,
  [Status.CANCELED]: CancelIcon,
};

export const StatusOptions: [
  React.FunctionComponent<React.SVGProps<SVGSVGElement>>,
  StatusValue,
  string,
][] = [
  [StatusIcons[Status.BACKLOG], Status.BACKLOG, StatusDisplay[Status.BACKLOG]],
  [StatusIcons[Status.TODO], Status.TODO, StatusDisplay[Status.TODO]],
  [
    StatusIcons[Status.IN_PROGRESS],
    Status.IN_PROGRESS,
    StatusDisplay[Status.IN_PROGRESS],
  ],
  [
    StatusIcons[Status.IN_REVIEW],
    Status.IN_REVIEW,
    StatusDisplay[Status.IN_REVIEW],
  ],
  [StatusIcons[Status.DONE], Status.DONE, StatusDisplay[Status.DONE]],
  [
    StatusIcons[Status.CANCELED],
    Status.CANCELED,
    StatusDisplay[Status.CANCELED],
  ],
];

export type AgentRun = {
  id: string;
  issue_id: string;
  app_user_id: string;
  workspace_id: string;
  start_time: Date;
  end_time: Date | null;
  model_provider: string;
  model_name: string;
  status: string | null;
  created: Date;
  modified: Date;
};

export type AgentRunMessage = {
  id: string;
  agent_run_id: string;
  workspace_id: string;
  message: string;
  type: string;
  created: Date;
  modified: Date;
};

export const LinkType = {
  BLOCKED_BY: "blocked_by",
  SUB_ISSUE: "sub_issue",
  RELATED: "related",
  DUPLICATE: "duplicate",
} as const;

export type LinkTypeValue = (typeof LinkType)[keyof typeof LinkType];

// Display text for outgoing links (this issue -> other issue)
export const LinkTypeDisplay = {
  [LinkType.BLOCKED_BY]: "Blocked by",
  [LinkType.SUB_ISSUE]: "Sub-issue of",
  [LinkType.RELATED]: "Related to",
  [LinkType.DUPLICATE]: "Duplicate of",
};

// Display text for incoming links (other issue -> this issue)
export const InverseLinkTypeDisplay = {
  [LinkType.BLOCKED_BY]: "Blocks",
  [LinkType.SUB_ISSUE]: "Parent of",
  [LinkType.RELATED]: "Related to",
  [LinkType.DUPLICATE]: "Duplicate of",
};

export type IssueLink = {
  id: string;
  source_issue_id: string;
  target_issue_id: string;
  link_type: LinkTypeValue;
  workspace_id: string;
  modified: Date;
  created: Date;
  synced: boolean;
};

export const WorkspaceTier = {
  FREE: "free",
  PRO: "pro",
} as const;

export type WorkspaceTierValue =
  (typeof WorkspaceTier)[keyof typeof WorkspaceTier];

// Get FREE_TIER_AGENT_RUN_LIMIT from environment variables
export const FREE_TIER_AGENT_RUN_LIMIT = parseInt(
  import.meta.env.VITE_FREE_TIER_AGENT_RUN_LIMIT || "25",
  10,
);

export type Workspace = {
  id: string;
  name: string;
  url: string;
  avatar_url?: string | null;
  allowlisted_domains?: string[] | null;
  tier: WorkspaceTierValue;
  current_billing_cycle_start_date: Date;
  successful_agent_runs_this_cycle: number;
  modified: Date;
  created: Date;
};
