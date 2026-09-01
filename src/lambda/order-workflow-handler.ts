import { logInfo } from "@/lib/logging.server";

type WorkflowStepEvent = {
  customerEmail?: string;
  customerName?: string;
  detailType?: string;
  eventId?: string;
  orderId?: string;
  paymentMethod?: string;
  prepareCompletedAt?: string;
  shippingAddress?: string;
  shouldFail?: boolean | string;
  shouldFailInvoice?: boolean | string;
  status?: string;
  totalAmount?: number;
  step?: "prepare" | "finalize" | string;
  source?: string;
  workflow?: string;
};

type WorkflowStepResult = {
  completedAt: string;
  customerEmail?: string;
  customerName?: string;
  detailType: string;
  eventId: string;
  orderId: string;
  paymentMethod?: string;
  prepareCompletedAt?: string;
  shippingAddress?: string;
  shouldFail?: boolean | string;
  shouldFailInvoice?: boolean | string;
  status?: string;
  totalAmount?: number;
  step: "prepare" | "finalize";
  source?: string;
  workflow: string;
};

function assertWorkflowInput(event: WorkflowStepEvent) {
  if (
    !event.workflow ||
    !event.step ||
    !event.detailType ||
    !event.orderId ||
    !event.eventId
  ) {
    throw new Error(
      "workflow, step, detailType, orderId, and eventId are required"
    );
  }

  return event as Required<
    Pick<
      WorkflowStepEvent,
      "detailType" | "eventId" | "orderId" | "step" | "workflow"
    >
  > &
    WorkflowStepEvent;
}

export async function handler(
  event: WorkflowStepEvent
): Promise<WorkflowStepResult> {
  const input = assertWorkflowInput(event);
  const shouldFail =
    input.shouldFail === true || input.shouldFail === "true" || input.shouldFail === "1";

  // STEP36 はワークフローの形を見せる段階なので、成功・失敗の分岐を明示する。
  if (shouldFail && input.step === "prepare") {
    throw new Error(`Simulated workflow failure for order ${input.orderId}`);
  }

  const completedAt = new Date().toISOString();

  logInfo("Order workflow step executed", {
    customerEmail: input.customerEmail ?? "unknown",
    customerName: input.customerName ?? "unknown",
    detailType: input.detailType,
    eventId: input.eventId,
    orderId: input.orderId,
    paymentMethod: input.paymentMethod ?? "unknown",
    step: input.step,
    shippingAddress: input.shippingAddress ?? "unknown",
    source: input.source ?? "unknown",
    workflow: input.workflow,
    status: input.status ?? "unknown",
    totalAmount: input.totalAmount ?? "unknown",
  });

  return {
    completedAt,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    detailType: input.detailType,
    eventId: input.eventId,
    orderId: input.orderId,
    paymentMethod: input.paymentMethod,
    prepareCompletedAt:
      input.step === "finalize"
        ? input.prepareCompletedAt ?? completedAt
        : completedAt,
    shippingAddress: input.shippingAddress,
    shouldFail: input.shouldFail,
    shouldFailInvoice: input.shouldFailInvoice,
    source: input.source,
    status: input.status,
    totalAmount: input.totalAmount,
    step: input.step as "prepare" | "finalize",
    workflow: input.workflow,
  };
}
