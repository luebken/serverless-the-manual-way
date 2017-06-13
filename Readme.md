# Serverless the manual way

Why? Because [abstractions save us time working, but they don’t save us time learning](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/).

## Helloworld with AWS

Goals:
* Minimmum steps to create helloworld (over http)
* Use the AWS CLI to configure, deploy and run a Lambda application. 
* Try to avoid the AWS web console. Use it only verify our CLI actions.
* Only automate things in a comprehensible way with known tools (make, shell, jq).

Steps:
* Step 0: Prerequisites 
  * a) Install AWS CLI & tools
  * b) Store AWS account number for scripts
* Step 1: Create a role to run the function
* Step 2: Create a helloworld function
* Step 3: Upload function code
* Step 4: Create the lambda function definition
* Step 5: Invoke the function manually
* Step 6: Create a public rest API



### Step 0: Prerequisites

#### a) Install AWS CLI & tools

	* Install the AWS CLI https://aws.amazon.com/cli/
	* Verify: `$ aws --version`
	* Have make, jq installed

#### b) Store AWS account number for scripts

	# Get your account number and store in an env variable.
	# We will use it to identify artefacts.
	$ AWS_ACCOUNT_NUMBER=$(aws sts get-caller-identity | jq -r .Account)
	# verify
	$ echo $AWS_ACCOUNT_NUMBER
	1234567890

### Step 1: Create a role to run the function

# Managed policy: AWSLambdaBasicExecutionRole

	# create a minimal policy document: 
	$ cat minimal-lambda-policy.json
	{
  		"Version": "2012-10-17",
  		"Statement": {
      		"Effect": "Allow",
      		"Principal": {
        		"Service": "lambda.amazonaws.com"
      		},
      	"Action": "sts:AssumeRole"
   		}
	}
	# create role:
	$ aws iam create-role --role-name my-aws-lambda-execution --assume-role-policy-document file://minimal-lambda-policy.json
	
	# attach execute policy
	$ aws iam attach-role-policy --role-name my-aws-lambda-execution --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

Links / learn more:
	* http://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-service.html
	* http://docs.aws.amazon.com/lambda/latest/dg/with-userapp-walkthrough-custom-events-create-iam-role.html


### Step 2: Create a helloworld function

	# create a function that sends a proper http response 
	$ cat handler.js
	'use strict';

	module.exports.helloWorld = (event, context, callback) => {
	const response = {
		statusCode: 200,
		body: JSON.stringify({
		message: 'helloworld',
		input: event,
		}),
	};

	callback(null, response);
	};

Links / learn more:
	* http://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html


### Step 3: Upload function code

The code is stored in S3 as a zip file:

	# make a S3 bucket:
	$ aws s3 mb s3://$AWS_ACCOUNT_NUMBER-helloworld
	make_bucket: 1234567890-helloworld

	# zip function:
	$ zip helloworld.zip helloworld.js
	adding: helloworld.js (deflated 28%)

	# upload code:
	$ aws s3 cp helloworld.zip s3://$AWS_ACCOUNT_NUMBER-helloworld	
	upload: ./helloworld.zip to s3://1234567890-helloworld/helloworld.zip


### Step 4: Create the lambda function definition
	
	# show help info about creating a function:
	$ aws lambda create-function help
	...
	SYNOPSIS
            create-function
          --function-name <value>
          --runtime <value>
          --role <value>
          --handler <value>
	...
	OPTIONS
       		--function-name (string)
          	The name you want to assign to the function you are uploading.
	...
		--runtime (string)
          	The runtime environment for the Lambda function you are uploading.
	...
		--role (string)
          	The Amazon Resource Name (ARN) of the IAM role	
	...
		--handler (string)
          	The function within your code that Lambda calls to begin execution.
	
	# Create function
	$ aws lambda create-function\
	 --function-name helloworld\
	 --runtime nodejs6.10\
	 --role arn:aws:iam::$AWS_ACCOUNT_NUMBER:role/my-aws-lambda-execution\
	 --handler helloworld.handler\
	 --code S3Bucket=$AWS_ACCOUNT_NUMBER-helloworld,S3Key=helloworld.zip

	 {
	    "TracingConfig": {
	        "Mode": "PassThrough"
	    },
	    "CodeSha256": "dVqbrjslslsiskl3s1qRilcTqMvRodldsis82721k=",
	    "FunctionName": "helloworld",
	    "CodeSize": 341,
	    "MemorySize": 128,
	    "FunctionArn": "arn:aws:lambda:us-east-1:123456790:function:helloworld",
	    "Version": "$LATEST",
	    "Role": "arn:aws:iam::123456790:role/my-aws-lambda-execution",
	    "Timeout": 3,
	    "LastModified": "2017-06-12T18:11:15.532+0000",
	    "Handler": "helloworld.handler",
	    "Runtime": "nodejs6.10",
	    "Description": ""
	}


### Step 5: Invoke the function manually

	# Invoke the function:
	$ aws lambda invoke --function-name helloworld --log-type Tail --invocation-type RequestResponse outfile.dat |jq -r .LogResult | base64 --decode

Learn more:

	* http://docs.aws.amazon.com/lambda/latest/dg/with-userapp-walkthrough-custom-events-invoke.html


### Step 6: Create a public rest API

	$ aws apigateway help

	# Create a Rest API. Save the id as $APP_ID 
	$ aws apigateway create-rest-api --name helloworld
	{
    	"name": "helloworld",
    	"id": "9mrksd7lm0j",
    	"createdDate": 1497362995
	}
	$ APP_ID=9mrksd7lm0j

	#save the root id of the api
	$ ROOT_ID=$(aws apigateway get-resources --rest-api-id $APP_ID | jq -r .items[0].id)

	# Create a resource Save the id as $RESOURCE_ID
	$ aws apigateway create-resource --rest-api-id=$APP_ID --parent-id=$ROOT_ID --path-part hello
	...
	$ RESOURCE_ID=taugbk

	# Create a method 
	$ aws apigateway put-method --rest-api-id=$APP_ID --resource-id=$RESOURCE_ID --http-method GET --authorization-type NONE


	# Attach lambda function
	$ aws apigateway put-integration \
	--rest-api-id $APP_ID \
	--resource-id $RESOURCE_ID \
	--http-method GET \
	--type AWS \
	--integration-http-method POST \
	--uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:$AWS_ACCOUNT_NUMBER:function:helloworld/invocations

	# set content-type response
	$ aws apigateway put-method-response \
	--rest-api-id $APP_ID \
	--resource-id $RESOURCE_ID \
	--http-method GET \
	--status-code 200 \
	--response-models "{\"application/json\": \"Empty\"}"

	# TODO
	$ aws apigateway put-integration-response \
	--rest-api-id $APP_ID \
	--resource-id $RESOURCE_ID \
	--http-method GET \
	--status-code 200 \
	--response-templates "{\"application/json\": \"\"}"

	#  Deploy the API. Save as $DEPLOYMENT_ID
	$ aws apigateway create-deployment \
	--rest-api-id $APP_ID \
	--stage-name prod

	# Grant something 1
	$ aws lambda add-permission \
	--function-name helloworld \
	--statement-id apigateway-test-2 \
	--action lambda:InvokeFunction \
	--principal apigateway.amazonaws.com \
	--source-arn "arn:aws:execute-api:us-east-1:$AWS_ACCOUNT_NUMBER:$APP_ID/*/GET/hello"

	$ aws lambda add-permission \
	--function-name helloworld \
	--statement-id apigateway-prod-2 \
	--action lambda:InvokeFunction \
	--principal apigateway.amazonaws.com \
	--source-arn "arn:aws:execute-api:us-east-1:$AWS_ACCOUNT_NUMBER:$APP_ID/prod/GET/hello"

	# Test 1
	$ aws apigateway test-invoke-method \
	--rest-api-id $APP_ID \
	--resource-id $RESOURCE_ID \
	--http-method GET \
	--path-with-query-string "hello" \
	--body ""

	# Test
	curl -v https://$APP_ID.execute-api.us-east-1.amazonaws.com/prod/hello

Learn more: 
	* http://docs.aws.amazon.com/lambda/latest/dg/with-on-demand-https-example-configure-event-source.html

### Step: Cleanup

	#roles
	$ aws iam detach-role-policy --role-name my-aws-lambda-execution --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
	
	$ aws iam delete-role --role-name my-aws-lambda-execution

	# delete function
	aws lambda delete-function --function-name helloworld






