# Serverless the hard way

## Helloworld with AWS

Goals:
* Minimmum steps to create helloworld (over http)
* We are going to user the AWS CLI to configure, deploy and run a Lambda application. 
* We try to avoid the AWS web console and only verify our CLI actions. 
* We also try to automate as little as possible so the indivdual steps are comprehensible.


### Prerequisites

* Install the AWS CLI https://aws.amazon.com/cli/
* Verify: `$ aws --version`


### Step 1: Create a role

# Managed policy: AWSLambdaBasicExecutionRole

http://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-service.html

	# create a policy document 
	// TODO figure out minimal version
	# create role
	$ aws iam create-role --role-name my-aws-lambda-execution --assume-role-policy-document file://helloworldpolicy.json
	# save role ARN
	$ aws iam get-role --role-name my-aws-lambda-execution | jq .Role.Arn
	# attach execute policy
	$ aws iam attach-role-policy --role-name my-aws-lambda-execution --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole




### Step 2: Upload code

	# get your account number. we will user it as aprefix
	$ AWS_ACCOUNT_NUMBER=$(aws sts get-caller-identity | jq -r .Account)
	# make a bucket
	$ aws s3 mb s3://$AWS_ACCOUNT_NUMBER-helloworld

	$ zip helloworld.zip handler.js

	# upload code
	$ aws s3 cp helloworld.zip s3://$AWS_ACCOUNT_NUMBER-helloworld	


### Step x: Create the lambda function


	
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
	
	# Create role first

	# Create function
	aws lambda create-function --function-name helloworld --runtime nodejs6.10 --role arn:aws:iam::$AWS_ACCOUNT_NUMBER:role/my-aws-lambda-execution --handler helloworld.index --code S3Bucket=$AWS_ACCOUNT_NUMBER-helloworld,S3Key=helloworld.zip	


## Cleanup

	#roles
	$ aws iam detach-role-policy --role-name my-aws-lambda-execution --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
	$ aws iam delete-role --role-name my-aws-lambda-execution




