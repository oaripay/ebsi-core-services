pipeline {
    agent any
    environment {
        VERSION=sh(script: 'sudo runuser -l ebsi1-robot -c "AWS_REPO=intebsi/notarization bash /opt/ebsi_containers_int/auto-deploy/minor_version.sh"', returnStdout: true).trim()
    }
    stages {
        stage('Clone repo') {
            steps {
               checkout scm;
            }
        }

        stage('SonarQube Analysis') {
            steps{
                sh "/var/lib/jenkins/tools/hudson.plugins.sonar.SonarRunnerInstallation/sonar-scanner/bin/sonar-scanner -Dsonar.host.url=https://infra.ebsi.xyz/sonar -Dsonar.projectName=1-notarization-uc -Dsonar.projectVersion=1.0 -Dsonar.projectKey=1-notarization-uc -Dsonar.sources=. -Dsonar.projectBaseDir=/var/lib/jenkins/workspace/1-notarization-uc"
            }

        }

        stage('Build image') {
            steps {
                sh "sudo VERSION=${VERSION}_${GIT_COMMIT} AWS_REPO=intebsi/notarization bash /opt/ebsi_containers_int/auto-deploy/build.sh"
            }
        }
        stage('Push to ECR') {
            steps {
                 sh "sudo `sudo su - ebsi1-robot -c 'aws ecr get-login --no-include-email --region eu-central-1'`"
                 sh "sudo docker push 305472350643.dkr.ecr.eu-central-1.amazonaws.com/intebsi/notarization"
             }
        }
        stage("Deploy on first machine") {
            steps {
                withCredentials([sshUserPrivateKey(credentialsId: 'ebsi1-robot', keyFileVariable: 'PK')]) {
                       sh "ssh -i $PK ebsi1-operator@app01-0-ebsi-int-lux.intebsi.xyz -o StrictHostKeyChecking=no -o 'UserKnownHostsFile /dev/null' -p 48722 'aws ecr get-login --no-include-email --region eu-central-1 | bash && cd /opt/ebsi/notarization && docker-compose pull && docker-compose up -d'"
                       sh "ssh -i $PK ebsi1-operator@app02-0-ebsi-int-lux.intebsi.xyz -o StrictHostKeyChecking=no -o 'UserKnownHostsFile /dev/null' -p 48722 'aws ecr get-login --no-include-email --region eu-central-1 | bash && cd /opt/ebsi/notarization && docker-compose pull && docker-compose up -d'"
                       sh "ssh -i $PK ebsi1-operator@app03-0-ebsi-int-lux.intebsi.xyz -o StrictHostKeyChecking=no -o 'UserKnownHostsFile /dev/null' -p 48722 'aws ecr get-login --no-include-email --region eu-central-1 | bash && cd /opt/ebsi/notarization && docker-compose pull && docker-compose up -d'"
                       sh "ssh -i $PK ebsi1-operator@app04-0-ebsi-int-lux.intebsi.xyz -o StrictHostKeyChecking=no -o 'UserKnownHostsFile /dev/null' -p 48722 'aws ecr get-login --no-include-email --region eu-central-1 | bash && cd /opt/ebsi/notarization && docker-compose pull && docker-compose up -d'"
                    }
                }
        }
    }
}
