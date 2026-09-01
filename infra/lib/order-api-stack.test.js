const cdk = require("aws-cdk-lib");
const { Template } = require("aws-cdk-lib/assertions");

const { OrderApiStack } = require("./order-api-stack");

describe("OrderApiStack monitoring", () => {
  it(
    "creates alarms for DLQ, backlog, workflow, API, and Lambda errors",
    () => {
      const app = new cdk.App();
      const stack = new OrderApiStack(app, "TestOrderApiStack", {
        corsOrigins: ["http://localhost:3000"],
        env: {
          account: "686910912663",
          region: "ap-northeast-1",
        },
        stage: "dev",
      });

      const template = Template.fromStack(stack);

      // 監視対象の CloudWatch Alarm が増減していないことを確認する。
      template.resourceCountIs("AWS::CloudWatch::Alarm", 9);

      // DLQ 監視があることを確認する。
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "oms-dev-order-processing-dlq-alarm",
      });

      // キュー滞留監視があることを確認する。
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "oms-dev-order-processing-backlog-alarm",
      });

      // Step Functions の失敗監視があることを確認する。
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "oms-dev-order-processing-workflow-failed-alarm",
      });

      // HTTP API の 5xx 監視があることを確認する。
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "oms-dev-order-api-5xx-alarm",
      });

      // 主要 Lambda の error 監視があることを確認する。
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "oms-dev-order-api-error-alarm",
      });
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "oms-dev-order-notification-error-alarm",
      });
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "oms-dev-order-queue-consumer-error-alarm",
      });
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "oms-dev-order-workflow-task-error-alarm",
      });
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        AlarmName: "oms-dev-order-invoice-generation-error-alarm",
      });
    },
    30000,
  );
});
