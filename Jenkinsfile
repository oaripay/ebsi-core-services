pipeline {
    agent any
    environment {
        VERSION=sh(script: 'sudo runuser -l ebsi1-robot -c "AWS_REPO=intebsi/storage-api bash /opt/ebsi_containers_int/auto-deploy/minor_version.sh"', returnStdout: true).trim()
    }
    stages {
        stage('Clone repo') {
            steps {
               checkout scm;
            }
        }
        stage('Build image') {
            steps {
                sh "sudo VERSION=${VERSION}_${GIT_COMMIT} AWS_REPO=intebsi/storage-api bash /opt/ebsi_containers_int/auto-deploy/build.sh"
            }
        }
        stage('Push to ECR') {
            steps {
                 sh "sudo `sudo su - ebsi1-robot -c 'aws ecr get-login --no-include-email --region eu-central-1'`"
                 sh "sudo docker push 305472350643.dkr.ecr.eu-central-1.amazonaws.com/intebsi/storage-api"
             }
        }
        stage("Deploy on first machine") {
            steps {
                withCredentials([sshUserPrivateKey(credentialsId: 'ebsi1-robot', keyFileVariable: 'PK')]) {
                       sh "ssh -i $PK ebsi1-operator@app01-0-ebsi-int-lux.intebsi.xyz -o StrictHostKeyChecking=no -o 'UserKnownHostsFile /dev/null' -p 48722 'aws ecr get-login --no-include-email --region eu-central-1 | bash && cd /opt/ebsi/storage-api && docker-compose pull && docker-compose up -d'"
                       sh "ssh -i $PK ebsi1-operator@app02-0-ebsi-int-lux.intebsi.xyz -o StrictHostKeyChecking=no -o 'UserKnownHostsFile /dev/null' -p 48722 'aws ecr get-login --no-include-email --region eu-central-1 | bash && cd /opt/ebsi/storage-api && docker-compose pull && docker-compose up -d'"
                    }
                }
        }
    }
}
