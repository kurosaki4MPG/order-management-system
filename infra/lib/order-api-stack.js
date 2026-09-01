const cdk = require("aws-cdk-lib");
const apigwv2 = require("aws-cdk-lib/aws-apigatewayv2");
const apigwv2Integrations = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const lambda = require("aws-cdk-lib/aws-lambda");
const lambdaNodejs = require("aws-cdk-lib/aws-lambda-nodejs");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const sqs = require("aws-cdk-lib/aws-sqs");
const path = require("path");
const events = require("aws-cdk-lib/aws-events");
const eventTargets = require("aws-cdk-lib/aws-events-targets");
const lambdaEventSources = require("aws-cdk-lib/aws-lambda-event-sources");
const sns = require("aws-cdk-lib/aws-sns");
const cloudwatch = require("aws-cdk-lib/aws-cloudwatch");
const s3 = require("aws-cdk-lib/aws-s3");
const stepfunctions = require("aws-cdk-lib/aws-stepfunctions");
const stepfunctionsTasks = require("aws-cdk-lib/aws-stepfunctions-tasks");
const logs = require("aws-cdk-lib/aws-logs");
const cognito = require("aws-cdk-lib/aws-cognito");

// 環境差分は stage と CORS に閉じ込め、他の構成はできるだけ固定にする。
function resolveEnvironmentConfig(stage, corsOrigins) {
  const normalizedStage = stage ?? "dev";
  const isProd = normalizedStage === "prod";
  const resolvedCorsOrigins = corsOrigins?.length
    ? corsOrigins
    : isProd
      ? ["https://app.example.com"]
      : ["http://localhost:3000"];

  if (isProd && (!corsOrigins || corsOrigins.length === 0)) {
    throw new Error(
      "prod stage requires corsOrigins. Pass -c corsOrigins=https://app.example.com or the production frontend URL.",
    );
  }

  return {
    corsOrigins: resolvedCorsOrigins,
    removalPolicy: isProd
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY,
    stage: normalizedStage,
  };
}

class OrderApiStack extends cdk.Stack {
  constructor(scope, id, props = {}) {
    super(scope, id, props);

    // 注文API、通知、非同期処理を 1 つのスタックとしてまとめる。
    const { stage, corsOrigins, removalPolicy } = resolveEnvironmentConfig(
      props.stage,
      props.corsOrigins,
    );
    const tableName = `oms-${stage}-orders`;
    const orderApiFunctionName = `oms-${stage}-order-api`;
    const cognitoCallbackUrls =
      stage === "prod"
        ? ["https://app.example.com/api/auth/callback"]
        : ["http://localhost:3000/api/auth/callback"]
    const cognitoLogoutUrls =
      stage === "prod"
        ? ["https://app.example.com/login"]
        : ["http://localhost:3000/login"]
    const cognitoDomainPrefix = `oms-${stage}-order-auth-${this.account}`

    const authUserPool = new cognito.UserPool(this, "AuthUserPool", {
      autoVerify: {
        email: true,
      },
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      userPoolName: `oms-${stage}-auth-users`,
    })

    authUserPool.addGroup("AdminGroup", {
      description: "Full access to the order management system",
      groupName: "admin",
      precedence: 1,
    })

    authUserPool.addGroup("OperatorGroup", {
      description: "Create and update orders without deletion",
      groupName: "operator",
      precedence: 2,
    })

    authUserPool.addGroup("ViewerGroup", {
      description: "Read-only access to the order management system",
      groupName: "viewer",
      precedence: 3,
    })

    const authUserPoolClient = authUserPool.addClient("AuthUserPoolClient", {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        callbackUrls: cognitoCallbackUrls,
        defaultRedirectUri: cognitoCallbackUrls[0],
        flows: {
          authorizationCodeGrant: true,
        },
        logoutUrls: cognitoLogoutUrls,
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
      },
      userPoolClientName: `oms-${stage}-web-client`,
    })

    const authUserPoolDomain = authUserPool.addDomain("AuthUserPoolDomain", {
      cognitoDomain: {
        domainPrefix: cognitoDomainPrefix,
      },
    })

    const orderEventsBus = new events.EventBus(this, "OrderEventsBus", {
      eventBusName: `oms-${stage}-order-events`,
    });

    const ordersTable = new dynamodb.Table(this, "OrdersTable", {
      // 初期段階は単一キーの単純なテーブルにして、設計を読みやすく保つ。
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "orderId",
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy,
      tableName,
    });

    const orderApiFunction = new lambdaNodejs.NodejsFunction(
      this,
      "OrderApiFunction",
      {
        // API Gateway の入り口を受ける Lambda。業務ロジックの起点になる。
        entry: path.join(
          __dirname,
          "../../src/lambda/order-api-gateway-handler.ts",
        ),
        environment: {
          ORDERS_TABLE_NAME: ordersTable.tableName,
          ORDER_EVENTS_BUS_NAME: orderEventsBus.eventBusName,
          ORDER_EVENTS_BUS_ARN: orderEventsBus.eventBusArn,
        },
        functionName: orderApiFunctionName,
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_22_X,
        timeout: cdk.Duration.seconds(10),
      },
    );

    ordersTable.grantReadWriteData(orderApiFunction);
    orderEventsBus.grantPutEventsTo(orderApiFunction);

    const orderNotificationsTopic = new sns.Topic(
      this,
      "OrderNotificationsTopic",
      {
        topicName: `oms-${stage}-order-notifications`,
      },
    );

    const orderNotificationFunction = new lambdaNodejs.NodejsFunction(
      this,
      "OrderNotificationFunction",
      {
        // EventBridge イベントを SNS 向けメッセージに変換する通知専用 Lambda。
        entry: path.join(
          __dirname,
          "../../src/lambda/order-notification-handler.ts",
        ),
        environment: {
          ORDER_NOTIFICATIONS_TOPIC_ARN: orderNotificationsTopic.topicArn,
        },
        functionName: `oms-${stage}-order-notification`,
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_22_X,
        timeout: cdk.Duration.seconds(10),
      },
    );

    orderNotificationsTopic.grantPublish(orderNotificationFunction);

    const notificationRuleTarget = new eventTargets.LambdaFunction(
      orderNotificationFunction,
    );

    const notificationRuleConfigs = [
      {
        detailType: "OrderCreated",
        id: "OrderCreatedNotificationRule",
        ruleName: `oms-${stage}-order-created-notification`,
      },
      {
        detailType: "OrderUpdated",
        id: "OrderUpdatedNotificationRule",
        ruleName: `oms-${stage}-order-updated-notification`,
      },
      {
        detailType: "OrderDeleted",
        id: "OrderDeletedNotificationRule",
        ruleName: `oms-${stage}-order-deleted-notification`,
      },
      {
        detailType: "OrderStatusChanged",
        id: "OrderStatusChangedNotificationRule",
        ruleName: `oms-${stage}-order-status-changed-notification`,
      },
    ];

    for (const config of notificationRuleConfigs) {
      // イベント種別ごとに同じ通知 Lambda を再利用する。
      new events.Rule(this, config.id, {
        description: `Send ${config.detailType} events to the notification Lambda for ${stage}`,
        eventBus: orderEventsBus,
        eventPattern: {
          detailType: [config.detailType],
          source: ["oms.orders"],
        },
        ruleName: config.ruleName,
        targets: [notificationRuleTarget],
      });
    }

    const orderProcessingDlq = new sqs.Queue(this, "OrderProcessingDlq", {
      // 失敗メッセージの隔離先を先に定義する。
      queueName: `oms-${stage}-order-processing-dlq`,
      retentionPeriod: cdk.Duration.days(14),
    });

    const orderProcessingQueue = new sqs.Queue(this, "OrderProcessingQueue", {
      // 通常処理はこのキューで受け、失敗時は DLQ に逃がす。
      queueName: `oms-${stage}-order-processing-queue`,
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: orderProcessingDlq,
      },
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(30),
      retentionPeriod: cdk.Duration.days(4),
    });

    const orderQueueConsumerFunction = new lambdaNodejs.NodejsFunction(
      this,
      "OrderQueueConsumerFunction",
      {
        // SQS をポーリングして後続処理を担当する Lambda。
        entry: path.join(__dirname, "../../src/lambda/order-queue-consumer.ts"),
        functionName: `oms-${stage}-order-queue-consumer`,
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_22_X,
        timeout: cdk.Duration.seconds(30),
      },
    );

    orderQueueConsumerFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(orderProcessingQueue, {
        batchSize: 1,
      }),
    );

    const orderProcessingRule = new events.Rule(
      this,
      "OrderProcessingQueueRule",
      {
        // 同じ業務イベントを通知系と非同期処理系に分岐させる。
        description: `Send order events to SQS for ${stage}`,
        eventBus: orderEventsBus,
        eventPattern: {
          detailType: [
            "OrderCreated",
            "OrderUpdated",
            "OrderDeleted",
            "OrderStatusChanged",
          ],
          source: ["oms.orders"],
        },
        ruleName: `oms-${stage}-order-processing-queue`,
        targets: [new eventTargets.SqsQueue(orderProcessingQueue)],
      },
    );

    orderProcessingQueue.grantConsumeMessages(orderQueueConsumerFunction);

    const invoicePdfBucket = new s3.Bucket(this, "InvoicePdfBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy,
      autoDeleteObjects: removalPolicy === cdk.RemovalPolicy.DESTROY,
      versioned: true,
    });

    const orderWorkflowTaskFunction = new lambdaNodejs.NodejsFunction(
      this,
      "OrderWorkflowTaskFunction",
      {
        // Step Functions の各タスクで呼び出す最小ワークフロー用 Lambda。
        entry: path.join(
          __dirname,
          "../../src/lambda/order-workflow-handler.ts",
        ),
        functionName: `oms-${stage}-order-workflow-task`,
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_22_X,
        timeout: cdk.Duration.seconds(30),
      },
    );

    const orderWorkflowLogs = new logs.LogGroup(this, "OrderWorkflowLogGroup", {
      // ワークフローの実行結果を追えるように、短期保持のログを残す。
      retention: logs.RetentionDays.ONE_WEEK,
    });

    const workflowFailure = new stepfunctions.Fail(
      this,
      "OrderWorkflowFailed",
      {
        cause: "The order workflow task reported an error",
        error: "OrderWorkflowFailed",
      },
    );

    const workflowSucceeded = new stepfunctions.Succeed(
      this,
      "OrderWorkflowSucceeded",
    );

    const orderInvoiceGenerationFunction = new lambdaNodejs.NodejsFunction(
      this,
      "OrderInvoiceGenerationFunction",
      {
        // Step Functions の最後で請求書 PDF を生成し、S3 と署名付き URL を返す。
        entry: path.join(
          __dirname,
          "../../src/lambda/order-invoice-generation-handler.ts",
        ),
        environment: {
          ORDERS_TABLE_NAME: ordersTable.tableName,
          PDF_INVOICE_AWS_REGION: this.region,
          PDF_INVOICE_BUCKET_NAME: invoicePdfBucket.bucketName,
        },
        bundling: {
          format: lambdaNodejs.OutputFormat.ESM,
          externalModules: [
            "@aws-sdk/*",
            "@react-pdf/renderer",
            "react",
          ],
          commandHooks: {
            afterBundling(inputDir, outputDir) {
              return [
                `mkdir -p ${outputDir}/public`,
                `cp -R ${inputDir}/public/fonts ${outputDir}/public/`,
              ];
            },
            beforeBundling() {
              return [];
            },
            beforeInstall() {
              return [];
            },
          },
          nodeModules: ["@react-pdf/renderer", "react"],
        },
        functionName: `oms-${stage}-order-invoice-generation`,
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_22_X,
        timeout: cdk.Duration.seconds(60),
        memorySize: 1024,
      },
    );

    const prepareOrderWorkflowTask = new stepfunctionsTasks.LambdaInvoke(
      this,
      "PrepareOrderWorkflowTask",
      {
        lambdaFunction: orderWorkflowTaskFunction,
        payload: stepfunctions.TaskInput.fromObject({
          customerEmail: stepfunctions.JsonPath.stringAt("$.customerEmail"),
          customerName: stepfunctions.JsonPath.stringAt("$.customerName"),
          detailType: stepfunctions.JsonPath.stringAt("$.detailType"),
          eventId: stepfunctions.JsonPath.stringAt("$.eventId"),
          orderId: stepfunctions.JsonPath.stringAt("$.orderId"),
          paymentMethod: stepfunctions.JsonPath.stringAt("$.paymentMethod"),
          shippingAddress: stepfunctions.JsonPath.stringAt("$.shippingAddress"),
          shouldFail: stepfunctions.JsonPath.stringAt("$.shouldFail"),
          shouldFailInvoice: stepfunctions.JsonPath.stringAt(
            "$.shouldFailInvoice",
          ),
          status: stepfunctions.JsonPath.stringAt("$.status"),
          totalAmount: stepfunctions.JsonPath.stringAt("$.totalAmount"),
          step: "prepare",
          source: stepfunctions.JsonPath.stringAt("$.source"),
          workflow: stepfunctions.JsonPath.stringAt("$.workflow"),
        }),
        payloadResponseOnly: true,
        retryOnServiceExceptions: true,
      },
    );

    const finalizeOrderWorkflowTask = new stepfunctionsTasks.LambdaInvoke(
      this,
      "FinalizeOrderWorkflowTask",
      {
        lambdaFunction: orderWorkflowTaskFunction,
        payload: stepfunctions.TaskInput.fromObject({
          customerEmail: stepfunctions.JsonPath.stringAt("$.customerEmail"),
          customerName: stepfunctions.JsonPath.stringAt("$.customerName"),
          detailType: stepfunctions.JsonPath.stringAt("$.detailType"),
          eventId: stepfunctions.JsonPath.stringAt("$.eventId"),
          orderId: stepfunctions.JsonPath.stringAt("$.orderId"),
          paymentMethod: stepfunctions.JsonPath.stringAt("$.paymentMethod"),
          prepareCompletedAt: stepfunctions.JsonPath.stringAt(
            "$.prepareCompletedAt",
          ),
          shippingAddress: stepfunctions.JsonPath.stringAt("$.shippingAddress"),
          shouldFail: stepfunctions.JsonPath.stringAt("$.shouldFail"),
          shouldFailInvoice: stepfunctions.JsonPath.stringAt(
            "$.shouldFailInvoice",
          ),
          status: stepfunctions.JsonPath.stringAt("$.status"),
          totalAmount: stepfunctions.JsonPath.stringAt("$.totalAmount"),
          step: "finalize",
          source: stepfunctions.JsonPath.stringAt("$.source"),
          workflow: stepfunctions.JsonPath.stringAt("$.workflow"),
        }),
        payloadResponseOnly: true,
        retryOnServiceExceptions: true,
      },
    );

    const generateInvoiceWorkflowTask = new stepfunctionsTasks.LambdaInvoke(
      this,
      "GenerateInvoiceWorkflowTask",
      {
        lambdaFunction: orderInvoiceGenerationFunction,
        payload: stepfunctions.TaskInput.fromObject({
          completedAt: stepfunctions.JsonPath.stringAt("$.completedAt"),
          customerEmail: stepfunctions.JsonPath.stringAt("$.customerEmail"),
          customerName: stepfunctions.JsonPath.stringAt("$.customerName"),
          detailType: stepfunctions.JsonPath.stringAt("$.detailType"),
          eventId: stepfunctions.JsonPath.stringAt("$.eventId"),
          orderId: stepfunctions.JsonPath.stringAt("$.orderId"),
          paymentMethod: stepfunctions.JsonPath.stringAt("$.paymentMethod"),
          prepareCompletedAt: stepfunctions.JsonPath.stringAt(
            "$.prepareCompletedAt",
          ),
          shippingAddress: stepfunctions.JsonPath.stringAt("$.shippingAddress"),
          shouldFail: stepfunctions.JsonPath.stringAt("$.shouldFail"),
          shouldFailInvoice: stepfunctions.JsonPath.stringAt(
            "$.shouldFailInvoice",
          ),
          source: stepfunctions.JsonPath.stringAt("$.source"),
          status: stepfunctions.JsonPath.stringAt("$.status"),
          step: "invoice",
          totalAmount: stepfunctions.JsonPath.numberAt("$.totalAmount"),
          workflow: stepfunctions.JsonPath.stringAt("$.workflow"),
        }),
        payloadResponseOnly: true,
        retryOnServiceExceptions: true,
      },
    );

    prepareOrderWorkflowTask.addCatch(workflowFailure, {
      resultPath: "$.error",
    });
    finalizeOrderWorkflowTask.addCatch(workflowFailure, {
      resultPath: "$.error",
    });
    generateInvoiceWorkflowTask.addCatch(workflowFailure, {
      resultPath: "$.error",
    });

    const orderWorkflowDefinition = stepfunctions.Chain.start(
      prepareOrderWorkflowTask,
    )
      .next(finalizeOrderWorkflowTask)
      .next(generateInvoiceWorkflowTask)
      .next(workflowSucceeded);

    const orderWorkflowStateMachine = new stepfunctions.StateMachine(
      this,
      "OrderWorkflowStateMachine",
      {
        definitionBody: stepfunctions.DefinitionBody.fromChainable(
          orderWorkflowDefinition,
        ),
        stateMachineName: `oms-${stage}-order-processing-workflow`,
        logs: {
          destination: orderWorkflowLogs,
          includeExecutionData: true,
          level: stepfunctions.LogLevel.ALL,
        },
        timeout: cdk.Duration.minutes(5),
        tracingEnabled: true,
      },
    );

    orderWorkflowTaskFunction.grantInvoke(orderWorkflowStateMachine);
    ordersTable.grantReadData(orderInvoiceGenerationFunction);
    invoicePdfBucket.grantReadWrite(orderInvoiceGenerationFunction);

    const orderProcessingWorkflowRule = new events.Rule(
      this,
      "OrderProcessingWorkflowRule",
      {
        // OrderCreated を受けて、注文処理ワークフローを自動起動する。
        description: `Start the order processing workflow for ${stage}`,
        eventBus: orderEventsBus,
        eventPattern: {
          detailType: ["OrderCreated"],
          source: ["oms.orders"],
        },
        ruleName: `oms-${stage}-order-processing-workflow`,
        targets: [
          new eventTargets.SfnStateMachine(orderWorkflowStateMachine, {
            input: events.RuleTargetInput.fromObject({
              customerEmail: events.EventField.fromPath(
                "$.detail.customerEmail",
              ),
              customerName: events.EventField.fromPath("$.detail.customerName"),
              detailType: events.EventField.detailType,
              eventId: events.EventField.fromPath("$.detail.eventId"),
              orderId: events.EventField.fromPath("$.detail.orderId"),
              paymentMethod: events.EventField.fromPath(
                "$.detail.paymentMethod",
              ),
              shippingAddress: events.EventField.fromPath(
                "$.detail.shippingAddress",
              ),
              shouldFail: false,
              source: events.EventField.source,
              status: events.EventField.fromPath("$.detail.status"),
              totalAmount: events.EventField.fromPath("$.detail.totalAmount"),
              workflow: "order-processing",
            }),
          }),
        ],
      },
    );

    const orderProcessingDlqAlarm = new cloudwatch.Alarm(
      this,
      "OrderProcessingDlqAlarm",
      {
        alarmDescription: `DLQ has visible messages in ${stage}`,
        alarmName: `oms-${stage}-order-processing-dlq-alarm`,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        datapointsToAlarm: 1,
        evaluationPeriods: 1,
        metric: orderProcessingDlq.metricApproximateNumberOfMessagesVisible({
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      },
    );

    const orderProcessingBacklogAlarm = new cloudwatch.Alarm(
      this,
      "OrderProcessingBacklogAlarm",
      {
        alarmDescription: `Order processing queue oldest message age exceeded threshold in ${stage}`,
        alarmName: `oms-${stage}-order-processing-backlog-alarm`,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        datapointsToAlarm: 1,
        evaluationPeriods: 1,
        metric: orderProcessingQueue.metricApproximateAgeOfOldestMessage({
          period: cdk.Duration.minutes(5),
        }),
        threshold: 300,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      },
    );

    const orderApiErrorAlarm = new cloudwatch.Alarm(
      this,
      "OrderApiErrorAlarm",
      {
        alarmDescription: `Order API Lambda errors in ${stage}`,
        alarmName: `oms-${stage}-order-api-error-alarm`,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        datapointsToAlarm: 1,
        evaluationPeriods: 1,
        metric: orderApiFunction.metricErrors({
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      },
    );

    const orderNotificationErrorAlarm = new cloudwatch.Alarm(
      this,
      "OrderNotificationErrorAlarm",
      {
        alarmDescription: `Order notification Lambda errors in ${stage}`,
        alarmName: `oms-${stage}-order-notification-error-alarm`,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        datapointsToAlarm: 1,
        evaluationPeriods: 1,
        metric: orderNotificationFunction.metricErrors({
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      },
    );

    const orderQueueConsumerErrorAlarm = new cloudwatch.Alarm(
      this,
      "OrderQueueConsumerErrorAlarm",
      {
        alarmDescription: `Order queue consumer Lambda errors in ${stage}`,
        alarmName: `oms-${stage}-order-queue-consumer-error-alarm`,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        datapointsToAlarm: 1,
        evaluationPeriods: 1,
        metric: orderQueueConsumerFunction.metricErrors({
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      },
    );

    const orderWorkflowTaskErrorAlarm = new cloudwatch.Alarm(
      this,
      "OrderWorkflowTaskErrorAlarm",
      {
        alarmDescription: `Order workflow task Lambda errors in ${stage}`,
        alarmName: `oms-${stage}-order-workflow-task-error-alarm`,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        datapointsToAlarm: 1,
        evaluationPeriods: 1,
        metric: orderWorkflowTaskFunction.metricErrors({
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      },
    );

    const orderInvoiceGenerationErrorAlarm = new cloudwatch.Alarm(
      this,
      "OrderInvoiceGenerationErrorAlarm",
      {
        alarmDescription: `Order invoice generation Lambda errors in ${stage}`,
        alarmName: `oms-${stage}-order-invoice-generation-error-alarm`,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        datapointsToAlarm: 1,
        evaluationPeriods: 1,
        metric: orderInvoiceGenerationFunction.metricErrors({
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      },
    );

    const orderWorkflowFailedAlarm = new cloudwatch.Alarm(
      this,
      "OrderWorkflowFailedAlarm",
      {
        alarmDescription: `Step Functions workflow failed in ${stage}`,
        alarmName: `oms-${stage}-order-processing-workflow-failed-alarm`,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        datapointsToAlarm: 1,
        evaluationPeriods: 1,
        metric: orderWorkflowStateMachine.metricFailed({
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      },
    );

    const orderApi = new apigwv2.HttpApi(this, "OrderHttpApi", {
      // 外部公開する HTTP 入口。CORS はフロントエンドの実運用先に合わせる。
      apiName: `oms-${stage}-order-api`,
      corsPreflight: {
        allowHeaders: ["Content-Type", "X-Request-Id"],
        allowMethods: [
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.OPTIONS,
          apigwv2.CorsHttpMethod.PATCH,
          apigwv2.CorsHttpMethod.POST,
        ],
        allowOrigins: corsOrigins,
      },
    });

    const orderApiIntegration = new apigwv2Integrations.HttpLambdaIntegration(
      "OrderApiIntegration",
      orderApiFunction,
      {
        // HTTP 情報は Lambda proxy としてそのまま渡す。
        payloadFormatVersion: apigwv2.PayloadFormatVersion.VERSION_1_0,
      },
    );

    orderApi.addRoutes({
      integration: orderApiIntegration,
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      path: "/orders",
    });

    orderApi.addRoutes({
      integration: orderApiIntegration,
      methods: [
        apigwv2.HttpMethod.GET,
        apigwv2.HttpMethod.PATCH,
        apigwv2.HttpMethod.DELETE,
      ],
      path: "/orders/{id}",
    });

    orderApi.addRoutes({
      integration: orderApiIntegration,
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH],
      path: "/orders/{id}/status",
    });

    const orderApi5xxAlarm = new cloudwatch.Alarm(this, "OrderApi5xxAlarm", {
      alarmDescription: `HTTP API server errors in ${stage}`,
      alarmName: `oms-${stage}-order-api-5xx-alarm`,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      datapointsToAlarm: 1,
      evaluationPeriods: 1,
      metric: orderApi.metricServerError({
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    cdk.Tags.of(this).add("Project", "order-management-system");
    cdk.Tags.of(this).add("Environment", stage);
    cdk.Tags.of(this).add("ManagedBy", "cdk");

    new cdk.CfnOutput(this, "Stage", {
      value: stage,
    });

    new cdk.CfnOutput(this, "CorsOrigins", {
      value: corsOrigins.join(","),
    });

    new cdk.CfnOutput(this, "StackName", {
      value: this.stackName,
    });

    new cdk.CfnOutput(this, "OrderEventsBusName", {
      value: orderEventsBus.eventBusName,
    });

    new cdk.CfnOutput(this, "OrderEventsBusArn", {
      value: orderEventsBus.eventBusArn,
    });

    new cdk.CfnOutput(this, "OrdersTableName", {
      value: ordersTable.tableName,
    });

    new cdk.CfnOutput(this, "OrdersTableArn", {
      value: ordersTable.tableArn,
    });

    new cdk.CfnOutput(this, "OrderApiFunctionName", {
      value: orderApiFunction.functionName,
    });

    new cdk.CfnOutput(this, "OrderApiFunctionArn", {
      value: orderApiFunction.functionArn,
    });

    new cdk.CfnOutput(this, "OrderNotificationFunctionName", {
      value: orderNotificationFunction.functionName,
    });

    new cdk.CfnOutput(this, "OrderNotificationFunctionArn", {
      value: orderNotificationFunction.functionArn,
    });

    new cdk.CfnOutput(this, "OrderNotificationsTopicArn", {
      value: orderNotificationsTopic.topicArn,
    });

    new cdk.CfnOutput(this, "OrderProcessingQueueUrl", {
      value: orderProcessingQueue.queueUrl,
    });

    new cdk.CfnOutput(this, "OrderProcessingQueueArn", {
      value: orderProcessingQueue.queueArn,
    });

    new cdk.CfnOutput(this, "OrderProcessingDlqUrl", {
      value: orderProcessingDlq.queueUrl,
    });

    new cdk.CfnOutput(this, "OrderProcessingDlqArn", {
      value: orderProcessingDlq.queueArn,
    });

    new cdk.CfnOutput(this, "OrderQueueConsumerFunctionName", {
      value: orderQueueConsumerFunction.functionName,
    });

    new cdk.CfnOutput(this, "OrderQueueConsumerFunctionArn", {
      value: orderQueueConsumerFunction.functionArn,
    });

    new cdk.CfnOutput(this, "OrderWorkflowTaskFunctionName", {
      value: orderWorkflowTaskFunction.functionName,
    });

    new cdk.CfnOutput(this, "OrderWorkflowTaskFunctionArn", {
      value: orderWorkflowTaskFunction.functionArn,
    });

    new cdk.CfnOutput(this, "OrderInvoiceGenerationFunctionName", {
      value: orderInvoiceGenerationFunction.functionName,
    });

    new cdk.CfnOutput(this, "OrderInvoiceGenerationFunctionArn", {
      value: orderInvoiceGenerationFunction.functionArn,
    });

    new cdk.CfnOutput(this, "OrderWorkflowStateMachineName", {
      value: orderWorkflowStateMachine.stateMachineName,
    });

    new cdk.CfnOutput(this, "OrderWorkflowStateMachineArn", {
      value: orderWorkflowStateMachine.stateMachineArn,
    });

    new cdk.CfnOutput(this, "OrderProcessingDlqAlarmName", {
      value: orderProcessingDlqAlarm.alarmName,
    });

    new cdk.CfnOutput(this, "OrderProcessingBacklogAlarmName", {
      value: orderProcessingBacklogAlarm.alarmName,
    });

    new cdk.CfnOutput(this, "OrderApi5xxAlarmName", {
      value: orderApi5xxAlarm.alarmName,
    });

    new cdk.CfnOutput(this, "OrderApiErrorAlarmName", {
      value: orderApiErrorAlarm.alarmName,
    });

    new cdk.CfnOutput(this, "OrderNotificationErrorAlarmName", {
      value: orderNotificationErrorAlarm.alarmName,
    });

    new cdk.CfnOutput(this, "OrderQueueConsumerErrorAlarmName", {
      value: orderQueueConsumerErrorAlarm.alarmName,
    });

    new cdk.CfnOutput(this, "OrderWorkflowTaskErrorAlarmName", {
      value: orderWorkflowTaskErrorAlarm.alarmName,
    });

    new cdk.CfnOutput(this, "OrderInvoiceGenerationErrorAlarmName", {
      value: orderInvoiceGenerationErrorAlarm.alarmName,
    });

    new cdk.CfnOutput(this, "OrderWorkflowFailedAlarmName", {
      value: orderWorkflowFailedAlarm.alarmName,
    });

    new cdk.CfnOutput(this, "InvoicePdfBucketName", {
      value: invoicePdfBucket.bucketName,
    });

    new cdk.CfnOutput(this, "InvoicePdfBucketArn", {
      value: invoicePdfBucket.bucketArn,
    });

    new cdk.CfnOutput(this, "OrderApiUrl", {
      value: orderApi.apiEndpoint,
    });

    new cdk.CfnOutput(this, "CognitoUserPoolId", {
      value: authUserPool.userPoolId,
    });

    new cdk.CfnOutput(this, "CognitoUserPoolClientId", {
      value: authUserPoolClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, "CognitoHostedUiBaseUrl", {
      value: authUserPoolDomain.baseUrl(),
    });

    new cdk.CfnOutput(this, "CognitoSignInUrl", {
      value: authUserPoolDomain.signInUrl(authUserPoolClient, {
        redirectUri: cognitoCallbackUrls[0],
      }),
    });

    new cdk.CfnOutput(this, "CognitoLogoutUrl", {
      value: `${authUserPoolDomain.baseUrl()}/logout?client_id=${authUserPoolClient.userPoolClientId}&logout_uri=${encodeURIComponent(cognitoLogoutUrls[0])}`,
    });
  }
}

module.exports = {
  OrderApiStack,
};
