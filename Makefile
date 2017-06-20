deploy:
	echo "deploying"
	zip helloworld.zip helloworld.js
	aws s3 cp helloworld.zip s3://${AWS_ACCOUNT_NUMBER}-helloworld
	aws lambda update-function-code --function-name helloworld --s3-bucket=${AWS_ACCOUNT_NUMBER}-helloworld --s3-key=helloworld.zip

test:
	curl -v https://${APP_ID}.execute-api.us-east-1.amazonaws.com/prod/hello