import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "public/assets/images/diagrams");

const PAD =
  "spacing=16;spacingTop=12;spacingBottom=12;spacingLeft=16;spacingRight=16;align=center;verticalAlign=middle;";

const STYLE = {
  compute: `rounded=1;whiteSpace=wrap;html=1;${PAD}fillColor=#ccfbf1;strokeColor=#0f766e;fontColor=#042f2e;fontFamily=Helvetica;fontSize=12;fontStyle=1;arcSize=8;strokeWidth=1.5;`,
  data: `shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=10;${PAD}fillColor=#dbeafe;strokeColor=#1d4ed8;fontColor=#1e3a8a;fontFamily=Helvetica;fontSize=12;fontStyle=1;strokeWidth=1.5;`,
  security: `rounded=1;whiteSpace=wrap;html=1;${PAD}fillColor=#fef3c7;strokeColor=#b45309;fontColor=#78350f;fontFamily=Helvetica;fontSize=12;fontStyle=1;arcSize=8;strokeWidth=1.5;`,
  diamond: `rhombus;whiteSpace=wrap;html=1;${PAD}fillColor=#fef3c7;strokeColor=#b45309;fontColor=#78350f;fontFamily=Helvetica;fontSize=12;fontStyle=1;strokeWidth=1.5;`,
  pe: `rounded=1;whiteSpace=wrap;html=1;${PAD}fillColor=#fef3c7;strokeColor=#b45309;fontColor=#78350f;fontFamily=Helvetica;fontSize=11;fontStyle=1;arcSize=6;strokeWidth=1.5;`,
  external: `rounded=1;whiteSpace=wrap;html=1;${PAD}fillColor=#f8fafc;strokeColor=#64748b;fontColor=#0f172a;fontFamily=Helvetica;fontSize=12;dashed=1;dashPattern=8 4;arcSize=12;strokeWidth=1.5;`,
  platform: `rounded=1;whiteSpace=wrap;html=1;${PAD}fillColor=#f1f5f9;strokeColor=#475569;fontColor=#0f172a;fontFamily=Helvetica;fontSize=12;fontStyle=1;arcSize=6;strokeWidth=1.5;`,
  vnet:
    "rounded=1;whiteSpace=wrap;html=1;absoluteArcSize=1;arcSize=6;fillColor=#e2e8f0;fillOpacity=28;strokeColor=#334155;strokeWidth=2;dashed=0;verticalAlign=top;align=left;spacingLeft=12;spacingTop=6;fontColor=#0f172a;fontFamily=Helvetica;fontSize=14;fontStyle=1;pointerEvents=0;connectable=0;",
  subnet:
    "rounded=1;whiteSpace=wrap;html=1;absoluteArcSize=1;arcSize=4;fillColor=#f8fafc;fillOpacity=45;strokeColor=#64748b;strokeWidth=1.5;dashed=1;dashPattern=8 6;verticalAlign=top;align=left;spacingLeft=10;spacingTop=6;fontColor=#475569;fontFamily=Helvetica;fontSize=12;fontStyle=1;pointerEvents=0;connectable=0;",
  group:
    "rounded=1;whiteSpace=wrap;html=1;absoluteArcSize=1;arcSize=4;fillColor=#f8fafc;fillOpacity=40;strokeColor=#94a3b8;dashed=1;dashPattern=8 6;verticalAlign=top;align=left;spacingLeft=10;spacingTop=6;fontColor=#475569;fontFamily=Helvetica;fontSize=13;fontStyle=1;pointerEvents=0;connectable=0;",
  edge:
    "edgeStyle=orthogonalEdgeStyle;endArrow=classic;html=1;strokeColor=#334155;strokeWidth=1.5;rounded=1;orthogonalLoop=1;jumpStyle=arc;jumpSize=6;fontColor=#0f172a;fontSize=10;fontFamily=Helvetica;fontStyle=1;labelBackgroundColor=#FAFAFA;",
  async:
    "edgeStyle=orthogonalEdgeStyle;endArrow=classic;html=1;dashed=1;dashPattern=8 4;strokeColor=#334155;strokeWidth=1.5;rounded=1;jumpStyle=arc;jumpSize=6;fontColor=#0f172a;fontSize=10;fontFamily=Helvetica;fontStyle=1;labelBackgroundColor=#FAFAFA;",
};

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function label(title, sub) {
  if (!sub) return esc(title);
  return `${esc(title)}&lt;br&gt;&lt;font style=&quot;font-size:10px&quot; color=&quot;#475569&quot;&gt;${esc(sub)}&lt;/font&gt;`;
}

function vertex(id, x, y, w, h, kind, title, sub = "") {
  if (!STYLE[kind]) throw new Error(`Unknown style ${kind}`);
  return `        <mxCell id="${id}" value="${label(title, sub)}" style="${STYLE[kind]}" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>
        </mxCell>`;
}

function group(id, x, y, w, h, title, kind = "subnet") {
  if (!STYLE[kind]) throw new Error(`Unknown style ${kind}`);
  return `        <mxCell id="${id}" value="${esc(title)}" style="${STYLE[kind]}" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>
        </mxCell>`;
}

function edge(id, source, target, text = "", dashed = false, points = []) {
  const style = dashed ? STYLE.async : STYLE.edge;
  const value = text ? esc(text) : "";
  const pts = points.length
    ? `<Array as="points">${points.map(([x, y]) => `<mxPoint x="${x}" y="${y}"/>`).join("")}</Array>`
    : "";
  return `        <mxCell id="${id}" value="${value}" style="${style}" edge="1" parent="1" source="${source}" target="${target}">
          <mxGeometry relative="1" as="geometry">${pts}</mxGeometry>
        </mxCell>`;
}

function uniqueIds(cells) {
  const ids = [...cells.join("\n").matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const seen = new Set();
  const dupes = [];
  for (const id of ids) {
    if (seen.has(id)) dupes.push(id);
    seen.add(id);
  }
  if (dupes.length) {
    throw new Error(`Duplicate Draw.io ids: ${[...new Set(dupes)].join(", ")}`);
  }
}

function file(name, pageW, pageH, cells) {
  uniqueIds(cells);
  return `<mxfile host="app.diagrams.net">
  <diagram name="${esc(name)}" id="page-1">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" page="1" pageWidth="${pageW}" pageHeight="${pageH}" background="#FAFAFA">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
${cells.join("\n")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;
}

const N = 150;
const H = 56;
const G = 20;

const diagrams = {
  "architecture-copilot-studio/architecture-copilot-studio-architecture_detailed.drawio": file(
    "Architecture Copilot Studio L2",
    1420,
    840,
    [
      group("gActors", 20, 200, 184, 140, "Outside", "group"),
      vertex("nArch", 36, 248, 152, 68, "external", "Architects", "engagement owners"),
      group("gEdge", 220, 40, 200, 760, "Public edge", "group"),
      vertex("nWaf", 244, 116, 152, 68, "security", "Front Door + WAF", "TLS / DDoS"),
      vertex("nApim", 244, 216, 152, 68, "platform", "API Management", "tenant context"),
      vertex("nEntra", 244, 316, 152, 68, "security", "Entra OIDC", "app roles"),
      vertex("nAbac", 244, 416, 152, 68, "security", "ABAC check", "Cosmos claims"),
      group("gVnet", 440, 40, 760, 760, "Azure VNet", "vnet"),
      group("gApp", 460, 76, 720, 424, "App subnet + NSG", "subnet"),
      vertex("nChat", 480, 116, 150, 68, "compute", "Copilot chat", "per engagement"),
      vertex("nCanvas", 662, 116, 150, 68, "compute", "Diagram canvas", "Mermaid / Draw.io"),
      vertex("nStage", 480, 216, 150, 68, "compute", "Stage stepper", "human gate"),
      vertex("nSignal", 662, 216, 150, 68, "platform", "SignalR", "live canvas"),
      vertex("nStart", 844, 116, 150, 68, "compute", "session_start"),
      vertex("nReq", 844, 216, 150, 68, "compute", "Requirements", "NFR synthesis"),
      vertex("nDia", 844, 316, 150, 68, "compute", "Diagram", "cloud-agnostic"),
      vertex("nMap", 844, 416, 150, 68, "compute", "Cloud map", "service mapping"),
      vertex("nCost", 1026, 116, 150, 68, "compute", "Cost gate", "design-time FinOps"),
      vertex("nGate", 1026, 216, 150, 68, "diamond", "Within budget?"),
      vertex("nCmp", 1026, 316, 150, 68, "compute", "Compare", "Azure / AWS / GCP"),
      vertex("nPub", 1026, 416, 150, 68, "compute", "Publish", "Draw.io artifact"),
      group("gPriv", 460, 564, 720, 216, "Private subnet + Private Link", "subnet"),
      vertex("nCosmos", 480, 604, 150, 68, "data", "Cosmos DB", "checkpoints"),
      vertex("nBlob", 662, 604, 150, 68, "data", "Blob artifacts", "maps / cost"),
      vertex("nAoai", 844, 604, 150, 68, "platform", "Azure OpenAI", "broker only"),
      vertex("nBroker", 1026, 604, 150, 68, "security", "Functions broker", "VNet + fail closed"),
      vertex("nPe", 480, 704, 150, 68, "pe", "Private Endpoints", "data plane"),
      vertex("nKv", 662, 704, 150, 68, "security", "Key Vault", "secrets / keys"),
      vertex("nSearch", 844, 704, 150, 68, "data", "AI Search", "ADR RAG"),
      vertex("nSb", 1026, 704, 150, 68, "platform", "Service Bus", "resume timeout"),
      group("gUntrust", 1220, 560, 180, 140, "Untrusted", "group"),
      vertex("nLlm", 1236, 604, 150, 68, "external", "Untrusted LLM", "no data-plane"),
      vertex("nBlock", 1236, 216, 150, 68, "security", "BLOCK execute", "over budget"),
      edge("eArchWaf", "nArch", "nWaf"),
      edge("eWafApim", "nWaf", "nApim"),
      edge("eApimChat", "nApim", "nChat"),
      edge("eEntraApim", "nEntra", "nApim", "JWT", true),
      edge("eAbacApim", "nAbac", "nApim", "tenant", true),
      edge("eChatStart", "nChat", "nStart"),
      edge("eSignalCanvas", "nSignal", "nCanvas", "sync", true),
      edge("eStartReq", "nStart", "nReq"),
      edge("eReqDia", "nReq", "nDia"),
      edge("eDiaMap", "nDia", "nMap"),
      edge("eMapCost", "nMap", "nCost", "", false, [
        [1010, 450],
        [1010, 150],
      ]),
      edge("eCostGate", "nCost", "nGate"),
      edge("eGateYes", "nGate", "nCmp", "yes"),
      edge("eGateNo", "nGate", "nBlock", "no", true),
      edge("eCmpPub", "nCmp", "nPub"),
      edge("ePubBroker", "nPub", "nBroker"),
      edge("eBrokerAoai", "nBroker", "nAoai"),
      edge("eBrokerLlm", "nBroker", "nLlm"),
      edge("ePeCosmos", "nPe", "nCosmos", "Private Link", true),
      edge("eKvBlob", "nKv", "nBlob", "encrypt", true),
      edge("eBrokerSb", "nBroker", "nSb", "timeout", true),
    ],
  ),
  "c6insights/c6insights-architecture_detailed.drawio": file(
    "C6 Insights L2",
    1400,
    720,
    [
      group("gSrc", 20, 40, 190, 220, "Sources", "group"),
      vertex("nTel", 40, 80, N, H, "external", "Vehicle telemetry", "Deep View feed"),
      vertex("nApi", 40, 160, N, H, "external", "Fuel / AQI / EV", "enrichment APIs"),
      group("gEdge", 20, 280, 190, 300, "Public edge", "group"),
      vertex("nWaf", 40, 324, N, H, "security", "ALB + WAF", "TLS ingress"),
      vertex("nIam", 40, 404, N, H, "security", "IAM roles", "least privilege"),
      vertex("nKms", 40, 484, N, H, "security", "KMS", "lake encryption"),
      group("gVpc", 230, 40, 1150, 640, "AWS VPC", "vnet"),
      group("gApp", 250, 76, 1110, 176, "Private app subnet + SG", "subnet"),
      vertex("nApiSvc", 270, 116, N, H, "compute", "FastAPI", "simulation APIs"),
      vertex("nRag", 440, 116, N, H, "compute", "Ollama + RAG", "EV incentives"),
      vertex("nMcp", 610, 116, N, H, "compute", "MCP access", "vehicle context"),
      vertex("nSim", 780, 116, N, H, "compute", "Simulation", "roadmap / ROI"),
      vertex("nUi", 950, 116, N, H, "platform", "Insights UI", "fleet planning"),
      vertex("nRmq", 1120, 116, N, H, "platform", "RabbitMQ", "jobs / DLQ"),
      group("gData", 250, 272, 1110, 384, "Private data subnet + SG", "subnet"),
      vertex("nMsk", 270, 316, N, H, "platform", "Amazon MSK", "Kafka ingest"),
      vertex("nLam", 440, 316, N, H, "compute", "Lambda", "fuel / AQI scrape"),
      vertex("nEmr", 610, 316, N, H, "compute", "Amazon EMR", "Spark jobs"),
      vertex("nS3", 780, 316, N, H, "data", "S3 data lake", "Iceberg-aligned"),
      vertex("nMongo", 950, 316, N, H, "data", "MongoDB", "raw telemetry"),
      vertex("nPg", 1120, 316, N, H, "data", "PostgreSQL", "job metadata"),
      vertex("nChroma", 270, 412, N, H, "data", "Chroma DB", "RAG vectors"),
      vertex("nSg", 440, 412, N, H, "security", "Security groups", "deny default"),
      vertex("nEp", 610, 412, N, H, "pe", "VPC endpoints", "S3 / EMR / KMS"),
      vertex("nObs", 780, 412, N, H, "platform", "CloudWatch", "audit traces"),
      edge("eTelMsk", "nTel", "nMsk"),
      edge("eApiLam", "nApi", "nLam"),
      edge("eWafApi", "nWaf", "nApiSvc"),
      edge("eMskEmr", "nMsk", "nEmr"),
      edge("eLamEmr", "nLam", "nEmr"),
      edge("eEmrS3", "nEmr", "nS3"),
      edge("eEmrMongo", "nEmr", "nMongo"),
      edge("eEmrPg", "nEmr", "nPg"),
      edge("eS3Rag", "nS3", "nRag"),
      edge("eChromaRag", "nChroma", "nRag"),
      edge("eRagSim", "nRag", "nSim"),
      edge("eMcpSim", "nMcp", "nSim", "vehicle", true),
      edge("eSimApi", "nSim", "nApiSvc"),
      edge("eApiUi", "nApiSvc", "nUi"),
      edge("eRmqApi", "nRmq", "nApiSvc", "complete", true),
      edge("eIamEmr", "nIam", "nEmr", "role", true),
      edge("eKmsS3", "nKms", "nS3", "encrypt", true),
      edge("eSgEmr", "nSg", "nEmr", "", true),
      edge("eEpS3", "nEp", "nS3", "PrivateLink", true),
      edge("eObsApi", "nObs", "nApiSvc", "trace", true),
    ],
  ),
  "tprm-platform/tprm-platform-architecture_detailed.drawio": file(
    "TPRM L2",
    1400,
    700,
    [
      group("gExt", 20, 200, 190, 140, "External", "group"),
      vertex("nSn", 40, 244, N, H, "external", "ServiceNow", "cases / questionnaires"),
      group("gEdge", 230, 40, 190, 620, "Public edge", "group"),
      vertex("nWaf", 250, 84, N, H, "security", "APIM + WAF", "TLS ingress"),
      vertex("nEntra", 250, 164, N, H, "security", "Entra ID", "OIDC / RBAC"),
      vertex("nKv", 250, 244, N, H, "security", "Key Vault", "secrets"),
      group("gVnet", 440, 40, 940, 620, "Azure VNet", "vnet"),
      group("gApp", 460, 76, 900, 268, "App subnet + NSG", "subnet"),
      vertex("nSb", 480, 116, N, H, "platform", "Service Bus", "async backbone"),
      vertex("nOrch", 650, 116, N, H, "compute", "Orchestration", "event-driven"),
      vertex("nAgent", 820, 116, N, H, "compute", "Agent runtime", "injection defense"),
      vertex("nDi", 990, 116, N, H, "compute", "Document Intel.", "evidence extract"),
      vertex("nPolicy", 480, 208, N, H, "security", "Tenant policy", "L1 / L2 / L3"),
      vertex("nKill", 650, 208, N, H, "security", "Kill switch", "one tenant"),
      vertex("nCb", 820, 208, N, H, "external", "SN callback", "no sync P2P"),
      vertex("nGov", 990, 208, N, H, "security", "Gov rails", "reusable GenAI"),
      group("gPriv", 460, 360, 900, 276, "Private subnet + Private Link", "subnet"),
      vertex("nPe", 480, 404, N, H, "pe", "Private Endpoints", "Cosmos / Blob"),
      vertex("nNsg", 650, 404, N, H, "security", "NSG", "deny by default"),
      vertex("nCosmos", 820, 404, N, H, "data", "Cosmos DB", "state / ABAC"),
      vertex("nBlob", 990, 404, N, H, "data", "Blob evidence", "queryable store"),
      vertex("nObs", 480, 500, N, H, "platform", "App Insights", "audit trace"),
      edge("eSnWaf", "nSn", "nWaf"),
      edge("eWafSb", "nWaf", "nSb"),
      edge("eSbOrch", "nSb", "nOrch"),
      edge("eOrchAgent", "nOrch", "nAgent"),
      edge("eAgentDi", "nAgent", "nDi"),
      edge("ePolicyOrch", "nPolicy", "nOrch"),
      edge("eKillPolicy", "nKill", "nPolicy"),
      edge("eOrchCb", "nOrch", "nCb", "callback", true),
      edge("eCbSn", "nCb", "nSn", "", true),
      edge("eEntraWaf", "nEntra", "nWaf", "JWT", true),
      edge("eKvOrch", "nKv", "nOrch", "secrets", true),
      edge("eAgentCosmos", "nAgent", "nCosmos"),
      edge("eDiBlob", "nDi", "nBlob"),
      edge("ePeCosmos", "nPe", "nCosmos", "Private Link", true),
      edge("eNsgOrch", "nNsg", "nOrch", "", true),
      edge("eOrchObs", "nOrch", "nObs", "trace", true),
    ],
  ),
  "deep-view-analytics/deep-view-analytics-architecture_detailed.drawio": file(
    "Deep View Analytics L2",
    1400,
    700,
    [
      group("gSrc", 20, 40, 190, 220, "Fleet edge", "group"),
      vertex("nVeh", 40, 80, N, H, "external", "500K+ vehicles", "5TB+/day"),
      vertex("nMkt", 40, 160, N, H, "external", "Ads / Salesforce", "context feeds"),
      group("gEdge", 20, 280, 190, 300, "Control plane", "group"),
      vertex("nIam", 40, 324, N, H, "security", "IAM + KMS", "least privilege"),
      vertex("nWaf", 40, 404, N, H, "security", "WAF / Cognito", "analyst access"),
      vertex("nCost", 40, 484, N, H, "security", "FinOps gates", "30% run-rate cut"),
      group("gVpc", 230, 40, 1150, 620, "AWS VPC", "vnet"),
      group("gApp", 250, 76, 1110, 176, "Private app subnet + SG", "subnet"),
      vertex("nKin", 270, 116, N, H, "compute", "Kinesis", "event fabric"),
      vertex("nLam", 440, 116, N, H, "compute", "Lambda", "volatile ingest"),
      vertex("nBuf", 610, 116, N, H, "security", "Lookback buffer", "exactly-once"),
      vertex("nGlue", 780, 116, N, H, "compute", "Glue Streaming", "serverless ETL"),
      vertex("nSm", 950, 116, N, H, "compute", "SageMaker", "MLOps"),
      vertex("nDash", 1120, 116, N, H, "compute", "Self-service", "governed BI"),
      group("gData", 250, 272, 1110, 364, "Private data subnet + SG", "subnet"),
      vertex("nIce", 270, 316, N, H, "data", "Iceberg on S3", "compaction"),
      vertex("nRs", 440, 316, N, H, "data", "Redshift Serverless", "private only"),
      vertex("nDq", 610, 316, N, H, "platform", "Quality gates", "CI contracts"),
      vertex("nSg", 780, 316, N, H, "security", "Security groups", "deny default"),
      vertex("nEp", 950, 316, N, H, "pe", "VPC endpoints", "S3 / Glue / RS"),
      vertex("nHealth", 270, 412, N, H, "compute", "Vehicle health"),
      vertex("nPred", 440, 412, N, H, "compute", "Predictive maint."),
      vertex("nEmi", 610, 412, N, H, "compute", "Emissions / risk"),
      vertex("nObs", 780, 412, N, H, "platform", "Observability", "5TB+/day quality"),
      edge("eVehKin", "nVeh", "nKin"),
      edge("eMktKin", "nMkt", "nKin"),
      edge("eKinLam", "nKin", "nLam"),
      edge("eLamBuf", "nLam", "nBuf"),
      edge("eBufGlue", "nBuf", "nGlue"),
      edge("eGlueIce", "nGlue", "nIce"),
      edge("eIceRs", "nIce", "nRs"),
      edge("eIceSm", "nIce", "nSm"),
      edge("eRsDash", "nRs", "nDash"),
      edge("eRsHealth", "nRs", "nHealth"),
      edge("eSmPred", "nSm", "nPred"),
      edge("eSmEmi", "nSm", "nEmi"),
      edge("eDqGlue", "nDq", "nGlue", "contract", true),
      edge("eIamGlue", "nIam", "nGlue", "role", true),
      edge("eWafDash", "nWaf", "nDash"),
      edge("eCostIce", "nCost", "nIce", "tiering", true),
      edge("eSgRs", "nSg", "nRs", "", true),
      edge("eEpRs", "nEp", "nRs", "PrivateLink", true),
      edge("eObsGlue", "nObs", "nGlue", "trace", true),
    ],
  ),
  "qlm/qlm-architecture_detailed.drawio": file(
    "QLM L2",
    1320,
    700,
    [
      group("gCam", 20, 200, 190, 140, "Field", "group"),
      vertex("nCam", 40, 244, N, H, "external", "Queue cameras", "service counters"),
      group("gEdge", 230, 40, 190, 620, "Public edge", "group"),
      vertex("nWaf", 250, 84, N, H, "security", "ALB + WAF", "TLS ingress"),
      vertex("nIam", 250, 164, N, H, "security", "IAM", "task roles"),
      vertex("nKms", 250, 244, N, H, "security", "KMS", "clip encryption"),
      group("gVpc", 440, 40, 860, 620, "AWS VPC", "vnet"),
      group("gApp", 460, 76, 820, 268, "Private app subnet + SG", "subnet"),
      vertex("nCv", 480, 116, N, H, "compute", "OpenCV", "frame process"),
      vertex("nTf", 650, 116, N, H, "compute", "TensorFlow", "people count"),
      vertex("nQ", 820, 116, N, H, "compute", "Queue length", "30% lower wait"),
      vertex("nApi", 990, 116, N, H, "compute", "Django API", "WebSocket"),
      vertex("nEcs", 480, 208, N, H, "platform", "ECS / K8s", "container runtime"),
      vertex("nUi", 650, 208, N, H, "platform", "Supervisor UI"),
      vertex("nAl", 820, 208, N, H, "security", "Threshold alerts", "SMS / push"),
      group("gData", 460, 360, 820, 276, "Private data subnet + SG", "subnet"),
      vertex("nPg", 480, 404, N, H, "data", "PostgreSQL", "analytics"),
      vertex("nRedis", 650, 404, N, H, "data", "Redis", "live cache"),
      vertex("nS3", 820, 404, N, H, "data", "S3 archives", "video clips"),
      vertex("nSg", 990, 404, N, H, "security", "Security groups", "deny default"),
      vertex("nEp", 480, 500, N, H, "pe", "VPC endpoints", "S3 / ECS"),
      edge("eCamWaf", "nCam", "nWaf"),
      edge("eWafCv", "nWaf", "nCv"),
      edge("eCvTf", "nCv", "nTf"),
      edge("eTfQ", "nTf", "nQ"),
      edge("eQApi", "nQ", "nApi"),
      edge("eQAl", "nQ", "nAl"),
      edge("eApiUi", "nApi", "nUi"),
      edge("eAlUi", "nAl", "nUi"),
      edge("eQPg", "nQ", "nPg"),
      edge("eQRedis", "nQ", "nRedis"),
      edge("eCvS3", "nCv", "nS3", "clips", true),
      edge("eIamEcs", "nIam", "nEcs", "role", true),
      edge("eKmsS3", "nKms", "nS3", "encrypt", true),
      edge("eSgPg", "nSg", "nPg", "", true),
      edge("eEpS3", "nEp", "nS3", "PrivateLink", true),
      edge("eEcsApi", "nEcs", "nApi", "", true),
    ],
  ),
  "self-analytics/self-analytics-architecture_detailed.drawio": file(
    "Self Analytics L2",
    1320,
    700,
    [
      group("gSrc", 20, 40, 190, 220, "Sources", "group"),
      vertex("nS1", 40, 80, N, H, "external", "SQL Server / MySQL"),
      vertex("nS2", 40, 160, N, H, "external", "PostgreSQL systems"),
      group("gEdge", 20, 280, 190, 300, "Public edge", "group"),
      vertex("nWaf", 40, 324, N, H, "security", "ALB + WAF"),
      vertex("nIam", 40, 404, N, H, "security", "IAM / AuthZ"),
      vertex("nDs", 40, 484, N, H, "external", "Data scientists"),
      group("gVpc", 230, 40, 1070, 620, "AWS VPC", "vnet"),
      group("gApp", 250, 76, 1030, 268, "Private app subnet + SG", "subnet"),
      vertex("nEtl", 270, 116, N, H, "compute", "ETL pipeline"),
      vertex("nProf", 440, 116, N, H, "compute", "Data profiler", "contracts"),
      vertex("nSch", 610, 116, N, H, "platform", "Sync scheduler"),
      vertex("nEng", 780, 116, N, H, "compute", "NEC-LABS engine"),
      vertex("nFeat", 950, 116, N, H, "compute", "Feature generator"),
      vertex("nApp", 270, 208, N, H, "compute", "Feature app", "Django"),
      vertex("nMl", 440, 208, N, H, "compute", "Governed models"),
      vertex("nDock", 610, 208, N, H, "platform", "Docker on AWS"),
      vertex("nObs", 780, 208, N, H, "platform", "Monitoring"),
      group("gData", 250, 360, 1030, 276, "Private data subnet + SG", "subnet"),
      vertex("nPg", 270, 404, N, H, "data", "PostgreSQL", "profiled data"),
      vertex("nRedis", 440, 404, N, H, "data", "Redis", "cache"),
      vertex("nSg", 610, 404, N, H, "security", "Security groups"),
      vertex("nEp", 780, 404, N, H, "pe", "VPC endpoints", "S3 / RDS"),
      vertex("nKms", 950, 404, N, H, "security", "KMS", "at rest"),
      edge("eS1Etl", "nS1", "nEtl"),
      edge("eS2Etl", "nS2", "nEtl"),
      edge("eWafApp", "nWaf", "nApp"),
      edge("eEtlProf", "nEtl", "nProf"),
      edge("eProfPg", "nProf", "nPg"),
      edge("ePgEng", "nPg", "nEng"),
      edge("eEngFeat", "nEng", "nFeat"),
      edge("eFeatApp", "nFeat", "nApp"),
      edge("eDsApp", "nDs", "nApp"),
      edge("eAppMl", "nApp", "nMl"),
      edge("eIamApp", "nIam", "nApp", "role", true),
      edge("eSgPg", "nSg", "nPg", "", true),
      edge("eKmsPg", "nKms", "nPg", "encrypt", true),
      edge("eDockApp", "nDock", "nApp", "", true),
      edge("eSchEtl", "nSch", "nEtl", "", true),
    ],
  ),
  "paos/paos-architecture_detailed.drawio": file(
    "PAOS L2",
    1320,
    700,
    [
      group("gUsers", 20, 200, 190, 140, "Users", "group"),
      vertex("nMgr", 40, 244, N, H, "external", "Retail managers", "inventory teams"),
      group("gDmz", 230, 40, 190, 620, "DMZ", "vnet"),
      vertex("nGw", 250, 84, N, H, "security", "Reverse proxy", "TLS terminate"),
      vertex("nAuth", 250, 164, N, H, "security", "AuthN / AuthZ", "session RBAC"),
      vertex("nUi", 250, 244, N, H, "compute", "Django portal"),
      group("gApp", 440, 40, 420, 620, "App zone", "subnet"),
      vertex("nIng", 460, 84, N, H, "compute", "Sales / inventory", "ingestion"),
      vertex("nSpark", 460, 164, 380, H, "compute", "Spark + Hadoop", "demand pipelines"),
      vertex("nMl", 460, 244, 380, H, "compute", "Forecast engine", "20% fewer stockouts"),
      vertex("nOrd", 460, 324, N, H, "compute", "Auto-order triggers"),
      vertex("nRep", 650, 324, N, H, "platform", "Recommendation reports"),
      vertex("nDash", 460, 404, N, H, "platform", "Demand dashboard"),
      group("gData", 880, 40, 420, 620, "Data zone", "subnet"),
      vertex("nSql", 910, 84, N, H, "data", "SQL store"),
      vertex("nHdp", 1090, 84, N, H, "data", "Hadoop cluster"),
      vertex("nFw", 910, 180, N, H, "security", "Zone firewall", "east-west deny"),
      vertex("nAcl", 1090, 180, N, H, "security", "ACL / audit"),
      vertex("nHyb", 910, 276, 330, H, "platform", "Hybrid / on-prem runtime"),
      edge("eMgrGw", "nMgr", "nGw"),
      edge("eGwAuth", "nGw", "nAuth"),
      edge("eAuthUi", "nAuth", "nUi"),
      edge("eUiIng", "nUi", "nIng"),
      edge("eIngSpark", "nIng", "nSpark"),
      edge("eSparkMl", "nSpark", "nMl"),
      edge("eSparkSql", "nSpark", "nSql"),
      edge("eSparkHdp", "nSpark", "nHdp"),
      edge("eMlRep", "nMl", "nRep"),
      edge("eMlOrd", "nMl", "nOrd"),
      edge("eSqlDash", "nSql", "nDash"),
      edge("eFwSql", "nFw", "nSql", "", true),
      edge("eAclHdp", "nAcl", "nHdp", "audit", true),
    ],
  ),
  "nec-iot-big-data/nec-iot-big-data-architecture_detailed.drawio": file(
    "NEC IoT Big Data L2",
    1400,
    700,
    [
      group("gField", 20, 180, 190, 180, "Field", "group"),
      vertex("nIot", 40, 224, N, H, "external", "Sensors / gateways", "50% faster setup"),
      vertex("nEdge", 40, 304, N, H, "compute", "Edge preprocess", "filter / translate"),
      group("gDmz", 230, 40, 190, 620, "DMZ", "vnet"),
      vertex("nGw", 250, 84, N, H, "security", "API gateway", "TLS / throttle"),
      vertex("nAuth", 250, 164, N, H, "security", "AuthN / AuthZ"),
      vertex("nFw", 250, 244, N, H, "security", "Perimeter FW"),
      group("gApp", 440, 40, 480, 620, "App zone", "subnet"),
      vertex("nKaf", 460, 84, N, H, "compute", "Kafka"),
      vertex("nMqtt", 650, 84, N, H, "compute", "MQTT"),
      vertex("nFl", 460, 180, N, H, "compute", "Spark / Flink", "stream"),
      vertex("nBat", 650, 180, N, H, "compute", "Hadoop + Spark", "batch / ETL"),
      vertex("nMl", 460, 276, N, H, "compute", "Predictive engine", "anomaly detect"),
      vertex("nApi", 650, 276, N, H, "compute", "Ops APIs"),
      vertex("nK8s", 460, 372, N, H, "platform", "Kubernetes"),
      vertex("nMms", 650, 372, N, H, "platform", "NEC MMS"),
      group("gData", 940, 40, 440, 620, "Data zone", "subnet"),
      vertex("nHdfs", 970, 84, N, H, "data", "HDFS", "raw"),
      vertex("nHbase", 1160, 84, N, H, "data", "HBase", "serving"),
      vertex("nAcl", 970, 180, N, H, "security", "ACL / Kerberos"),
      vertex("nSeg", 1160, 180, N, H, "security", "Zone isolation"),
      vertex("nViz", 970, 276, N, H, "platform", "Ops dashboards"),
      edge("eIotEdge", "nIot", "nEdge"),
      edge("eEdgeGw", "nEdge", "nGw"),
      edge("eGwKaf", "nGw", "nKaf"),
      edge("eGwMqtt", "nGw", "nMqtt"),
      edge("eKafFl", "nKaf", "nFl"),
      edge("eMqttBat", "nMqtt", "nBat"),
      edge("eFlHdfs", "nFl", "nHdfs"),
      edge("eBatHbase", "nBat", "nHbase"),
      edge("eHdfsMl", "nHdfs", "nMl"),
      edge("eMlViz", "nMl", "nViz"),
      edge("eApiViz", "nApi", "nViz"),
      edge("eAuthGw", "nAuth", "nGw", "JWT", true),
      edge("eFwGw", "nFw", "nGw", "", true),
      edge("eAclHdfs", "nAcl", "nHdfs", "", true),
      edge("eSegHbase", "nSeg", "nHbase", "", true),
      edge("eK8sApi", "nK8s", "nApi", "", true),
    ],
  ),
};

for (const [rel, xml] of Object.entries(diagrams)) {
  if (/value="[^"]*"[a-zA-Z=]/.test(xml) || xml.includes('style="font-size')) {
    throw new Error(`Malformed XML attributes in ${rel}`);
  }
  const dest = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, xml);
  console.log(rel);
}
