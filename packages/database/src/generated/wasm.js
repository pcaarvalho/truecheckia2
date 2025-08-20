
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('./runtime/wasm.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}





/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  password: 'password',
  googleId: 'googleId',
  name: 'name',
  avatar: 'avatar',
  plan: 'plan',
  credits: 'credits',
  creditsResetAt: 'creditsResetAt',
  apiKey: 'apiKey',
  role: 'role',
  emailVerified: 'emailVerified',
  emailVerificationToken: 'emailVerificationToken',
  emailVerificationExpires: 'emailVerificationExpires',
  passwordResetToken: 'passwordResetToken',
  passwordResetExpires: 'passwordResetExpires',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RelationLoadStrategy = {
  query: 'query',
  join: 'join'
};

exports.Prisma.AnalysisScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  text: 'text',
  wordCount: 'wordCount',
  charCount: 'charCount',
  language: 'language',
  aiScore: 'aiScore',
  confidence: 'confidence',
  isAiGenerated: 'isAiGenerated',
  indicators: 'indicators',
  explanation: 'explanation',
  suspiciousParts: 'suspiciousParts',
  modelUsed: 'modelUsed',
  processingTime: 'processingTime',
  cached: 'cached',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  stripeCustomerId: 'stripeCustomerId',
  stripeSubId: 'stripeSubId',
  stripePriceId: 'stripePriceId',
  plan: 'plan',
  status: 'status',
  currentPeriodEnd: 'currentPeriodEnd',
  cancelAtPeriodEnd: 'cancelAtPeriodEnd',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ApiUsageScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  endpoint: 'endpoint',
  method: 'method',
  statusCode: 'statusCode',
  responseTime: 'responseTime',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title: 'title',
  message: 'message',
  read: 'read',
  readAt: 'readAt',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.CachedAnalysisScalarFieldEnum = {
  id: 'id',
  textHash: 'textHash',
  result: 'result',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.QueryPerformanceScalarFieldEnum = {
  id: 'id',
  queryType: 'queryType',
  executionTime: 'executionTime',
  recordCount: 'recordCount',
  indexesUsed: 'indexesUsed',
  createdAt: 'createdAt'
};

exports.Prisma.SystemHealthScalarFieldEnum = {
  id: 'id',
  service: 'service',
  status: 'status',
  responseTime: 'responseTime',
  errorRate: 'errorRate',
  throughput: 'throughput',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.DatabaseMetricsScalarFieldEnum = {
  id: 'id',
  connectionPoolSize: 'connectionPoolSize',
  activeConnections: 'activeConnections',
  idleConnections: 'idleConnections',
  queriesPerSecond: 'queriesPerSecond',
  averageQueryTime: 'averageQueryTime',
  slowQueries: 'slowQueries',
  createdAt: 'createdAt'
};

exports.Prisma.AnalyticsEventScalarFieldEnum = {
  id: 'id',
  eventType: 'eventType',
  userId: 'userId',
  sessionId: 'sessionId',
  properties: 'properties',
  createdAt: 'createdAt',
  date: 'date'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.Plan = exports.$Enums.Plan = {
  FREE: 'FREE',
  PRO: 'PRO',
  ENTERPRISE: 'ENTERPRISE'
};

exports.Role = exports.$Enums.Role = {
  USER: 'USER',
  ADMIN: 'ADMIN'
};

exports.Confidence = exports.$Enums.Confidence = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

exports.SubStatus = exports.$Enums.SubStatus = {
  TRIALING: 'TRIALING',
  ACTIVE: 'ACTIVE',
  CANCELED: 'CANCELED',
  INCOMPLETE: 'INCOMPLETE',
  INCOMPLETE_EXPIRED: 'INCOMPLETE_EXPIRED',
  PAST_DUE: 'PAST_DUE',
  UNPAID: 'UNPAID',
  PAUSED: 'PAUSED'
};

exports.NotifType = exports.$Enums.NotifType = {
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CREDIT_LOW: 'CREDIT_LOW',
  SUBSCRIPTION: 'SUBSCRIPTION',
  ANALYSIS: 'ANALYSIS'
};

exports.HealthStatus = exports.$Enums.HealthStatus = {
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  DOWN: 'DOWN',
  MAINTENANCE: 'MAINTENANCE'
};

exports.Prisma.ModelName = {
  User: 'User',
  Analysis: 'Analysis',
  Subscription: 'Subscription',
  ApiUsage: 'ApiUsage',
  Notification: 'Notification',
  CachedAnalysis: 'CachedAnalysis',
  QueryPerformance: 'QueryPerformance',
  SystemHealth: 'SystemHealth',
  DatabaseMetrics: 'DatabaseMetrics',
  AnalyticsEvent: 'AnalyticsEvent'
};
/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "/Users/pedro/Projetos/Producao/truecheckia2/packages/database/src/generated",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "darwin-arm64",
        "native": true
      },
      {
        "fromEnvVar": null,
        "value": "rhel-openssl-3.0.x"
      },
      {
        "fromEnvVar": null,
        "value": "linux-musl-openssl-3.0.x"
      }
    ],
    "previewFeatures": [
      "driverAdapters",
      "postgresqlExtensions",
      "relationJoins"
    ],
    "sourceFilePath": "/Users/pedro/Projetos/Producao/truecheckia2/packages/database/prisma/schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": null
  },
  "relativePath": "../../prisma",
  "clientVersion": "5.22.0",
  "engineVersion": "605197351a3c8bdd595af2d2a9bc3025bca48ea2",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "generator client {\n  provider        = \"prisma-client-js\"\n  engineType      = \"library\"\n  binaryTargets   = [\"native\", \"rhel-openssl-3.0.x\", \"linux-musl-openssl-3.0.x\"]\n  previewFeatures = [\"driverAdapters\", \"relationJoins\", \"postgresqlExtensions\"]\n  output          = \"../src/generated\"\n}\n\ndatasource db {\n  provider          = \"postgresql\"\n  url               = env(\"DATABASE_URL\")\n  directUrl         = env(\"DIRECT_URL\")\n  shadowDatabaseUrl = env(\"SHADOW_DATABASE_URL\")\n  extensions        = [pg_stat_statements(map: \"pg_stat_statements\")]\n}\n\nmodel User {\n  id             String   @id @default(cuid())\n  email          String   @unique\n  password       String?\n  googleId       String?  @unique\n  name           String?\n  avatar         String?\n  plan           Plan     @default(FREE)\n  credits        Int      @default(10)\n  creditsResetAt DateTime @default(now())\n  apiKey         String?  @unique @default(cuid())\n  role           Role     @default(USER)\n  emailVerified  Boolean  @default(false)\n\n  // Email verification fields\n  emailVerificationToken   String?   @unique\n  emailVerificationExpires DateTime?\n\n  // Password reset fields\n  passwordResetToken   String?   @unique\n  passwordResetExpires DateTime?\n\n  analyses      Analysis[]\n  subscription  Subscription?\n  apiUsage      ApiUsage[]\n  notifications Notification[]\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([email])\n  @@index([googleId])\n  @@index([apiKey])\n  @@index([emailVerificationToken])\n  @@index([passwordResetToken])\n  @@index([plan, credits, createdAt]) // Composite for plan queries with date filtering\n  @@index([emailVerified, plan]) // For verified users by plan\n  @@index([creditsResetAt]) // For credit reset jobs\n  @@index([role, createdAt]) // Admin queries\n  @@index([updatedAt]) // For sync operations\n}\n\nmodel Analysis {\n  id     String @id @default(cuid())\n  userId String\n  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  text      String @db.Text\n  wordCount Int\n  charCount Int\n  language  String @default(\"pt\")\n\n  aiScore       Float // 0-100 percentage\n  confidence    Confidence\n  isAiGenerated Boolean\n\n  indicators      Json // Array of detected patterns\n  explanation     String @db.Text\n  suspiciousParts Json // Array of text segments with scores\n\n  modelUsed      String  @default(\"gpt-4\")\n  processingTime Int // milliseconds\n  cached         Boolean @default(false)\n\n  metadata Json? // Additional data\n\n  createdAt DateTime @default(now())\n\n  @@index([userId, createdAt(sort: Desc)]) // Primary user history query\n  @@index([userId, isAiGenerated, createdAt(sort: Desc)]) // Filtered history\n  @@index([aiScore, confidence]) // Score-based queries\n  @@index([language, createdAt(sort: Desc)]) // Language analytics\n  @@index([cached, createdAt]) // Cache management\n  @@index([modelUsed, createdAt]) // Model performance tracking\n  @@index([wordCount]) // Analytics queries\n  @@index([processingTime, createdAt]) // Performance monitoring\n}\n\nmodel Subscription {\n  id     String @id @default(cuid())\n  userId String @unique\n  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  stripeCustomerId String  @unique\n  stripeSubId      String? @unique\n  stripePriceId    String?\n\n  plan   Plan\n  status SubStatus @default(TRIALING)\n\n  currentPeriodEnd  DateTime?\n  cancelAtPeriodEnd Boolean   @default(false)\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([stripeCustomerId])\n  @@index([stripeSubId])\n  @@index([status, currentPeriodEnd]) // For subscription management\n  @@index([plan, status]) // Plan analytics\n  @@index([cancelAtPeriodEnd, currentPeriodEnd]) // Cancellation processing\n}\n\nmodel ApiUsage {\n  id     String @id @default(cuid())\n  userId String\n  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  endpoint     String\n  method       String\n  statusCode   Int\n  responseTime Int // milliseconds\n\n  ipAddress String?\n  userAgent String?\n\n  createdAt DateTime @default(now())\n\n  @@index([userId, createdAt(sort: Desc)]) // User API usage history\n  @@index([endpoint, createdAt(sort: Desc)]) // Endpoint analytics\n  @@index([statusCode, createdAt]) // Error monitoring\n  @@index([createdAt(sort: Desc)]) // General analytics\n  @@index([userId, endpoint, createdAt(sort: Desc)]) // Detailed user tracking\n  @@index([responseTime, createdAt]) // Performance monitoring\n}\n\nmodel Notification {\n  id     String @id @default(cuid())\n  userId String\n  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  type    NotifType\n  title   String\n  message String    @db.Text\n\n  read   Boolean   @default(false)\n  readAt DateTime?\n\n  metadata Json?\n\n  createdAt DateTime @default(now())\n\n  @@index([userId, read, createdAt(sort: Desc)]) // User notification feed\n  @@index([userId, type, read]) // Filtered notifications\n  @@index([type, createdAt(sort: Desc)]) // Admin monitoring\n  @@index([read, createdAt]) // Mark as read operations\n}\n\nmodel CachedAnalysis {\n  id       String @id @default(cuid())\n  textHash String @unique\n\n  result    Json\n  expiresAt DateTime\n\n  createdAt DateTime @default(now())\n\n  @@index([textHash]) // Primary lookup\n  @@index([expiresAt]) // Cleanup operations\n  @@index([createdAt]) // Analytics\n}\n\n// New models for production monitoring and performance\n\nmodel QueryPerformance {\n  id            String @id @default(cuid())\n  queryType     String // Type of query (user_lookup, analysis_history, etc.)\n  executionTime Int // milliseconds\n  recordCount   Int // number of records processed\n  indexesUsed   Json? // which indexes were used\n\n  createdAt DateTime @default(now())\n\n  @@index([queryType, createdAt(sort: Desc)])\n  @@index([executionTime, createdAt])\n}\n\nmodel SystemHealth {\n  id           String       @id @default(cuid())\n  service      String // database, api, cache, etc.\n  status       HealthStatus\n  responseTime Int? // milliseconds\n  errorRate    Float? // percentage\n  throughput   Int? // requests per second\n\n  metadata Json?\n\n  createdAt DateTime @default(now())\n\n  @@index([service, status, createdAt(sort: Desc)])\n  @@index([service, createdAt(sort: Desc)])\n}\n\nmodel DatabaseMetrics {\n  id                 String @id @default(cuid())\n  connectionPoolSize Int\n  activeConnections  Int\n  idleConnections    Int\n  queriesPerSecond   Float\n  averageQueryTime   Float\n  slowQueries        Int // queries > 1000ms\n\n  createdAt DateTime @default(now())\n\n  @@index([createdAt(sort: Desc)])\n}\n\n// Partitioned table for high-volume analytics data\nmodel AnalyticsEvent {\n  id        String  @id @default(cuid())\n  eventType String // page_view, analysis_request, subscription_change, etc.\n  userId    String?\n  sessionId String?\n\n  properties Json // flexible event properties\n\n  createdAt DateTime @default(now())\n  date      DateTime @default(now()) @db.Date // For partitioning\n\n  @@index([eventType, date])\n  @@index([userId, eventType, date])\n  @@index([sessionId, date])\n  @@index([date, eventType]) // Optimized for time-series queries\n}\n\nenum Plan {\n  FREE\n  PRO\n  ENTERPRISE\n}\n\nenum Role {\n  USER\n  ADMIN\n}\n\nenum Confidence {\n  HIGH\n  MEDIUM\n  LOW\n}\n\nenum SubStatus {\n  TRIALING\n  ACTIVE\n  CANCELED\n  INCOMPLETE\n  INCOMPLETE_EXPIRED\n  PAST_DUE\n  UNPAID\n  PAUSED\n}\n\nenum NotifType {\n  INFO\n  SUCCESS\n  WARNING\n  ERROR\n  CREDIT_LOW\n  SUBSCRIPTION\n  ANALYSIS\n}\n\nenum HealthStatus {\n  HEALTHY\n  DEGRADED\n  DOWN\n  MAINTENANCE\n}\n",
  "inlineSchemaHash": "0a4e10eececb433033d713ed8b0bfe72dcd9ca68c8564dd756130e5d7d6e5a12",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"User\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"password\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"googleId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"avatar\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"plan\",\"kind\":\"enum\",\"type\":\"Plan\"},{\"name\":\"credits\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"creditsResetAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"apiKey\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"role\",\"kind\":\"enum\",\"type\":\"Role\"},{\"name\":\"emailVerified\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"emailVerificationToken\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"emailVerificationExpires\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"passwordResetToken\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"passwordResetExpires\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"analyses\",\"kind\":\"object\",\"type\":\"Analysis\",\"relationName\":\"AnalysisToUser\"},{\"name\":\"subscription\",\"kind\":\"object\",\"type\":\"Subscription\",\"relationName\":\"SubscriptionToUser\"},{\"name\":\"apiUsage\",\"kind\":\"object\",\"type\":\"ApiUsage\",\"relationName\":\"ApiUsageToUser\"},{\"name\":\"notifications\",\"kind\":\"object\",\"type\":\"Notification\",\"relationName\":\"NotificationToUser\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Analysis\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"AnalysisToUser\"},{\"name\":\"text\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"wordCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"charCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"language\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"aiScore\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"confidence\",\"kind\":\"enum\",\"type\":\"Confidence\"},{\"name\":\"isAiGenerated\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"indicators\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"explanation\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"suspiciousParts\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"modelUsed\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"processingTime\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"cached\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"metadata\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Subscription\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"SubscriptionToUser\"},{\"name\":\"stripeCustomerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"stripeSubId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"stripePriceId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"plan\",\"kind\":\"enum\",\"type\":\"Plan\"},{\"name\":\"status\",\"kind\":\"enum\",\"type\":\"SubStatus\"},{\"name\":\"currentPeriodEnd\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"cancelAtPeriodEnd\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"ApiUsage\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"ApiUsageToUser\"},{\"name\":\"endpoint\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"method\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"statusCode\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"responseTime\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"ipAddress\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userAgent\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Notification\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"NotificationToUser\"},{\"name\":\"type\",\"kind\":\"enum\",\"type\":\"NotifType\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"message\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"read\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"readAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"metadata\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"CachedAnalysis\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"textHash\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"result\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"expiresAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"QueryPerformance\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"queryType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"executionTime\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"recordCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"indexesUsed\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"SystemHealth\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"service\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"enum\",\"type\":\"HealthStatus\"},{\"name\":\"responseTime\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"errorRate\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"throughput\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"metadata\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"DatabaseMetrics\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"connectionPoolSize\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"activeConnections\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"idleConnections\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"queriesPerSecond\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"averageQueryTime\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"slowQueries\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"AnalyticsEvent\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"eventType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sessionId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"properties\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"date\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null}},\"enums\":{},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = {
  getRuntime: () => require('./query_engine_bg.js'),
  getQueryEngineWasmModule: async () => {
    const loader = (await import('#wasm-engine-loader')).default
    const engine = (await loader).default
    return engine 
  }
}

config.injectableEdgeEnv = () => ({
  parsed: {
    DATABASE_URL: typeof globalThis !== 'undefined' && globalThis['DATABASE_URL'] || typeof process !== 'undefined' && process.env && process.env.DATABASE_URL || undefined
  }
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

