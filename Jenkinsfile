pipeline {
    agent any
    environment {
        VERSION=sh(script: 'sudo runuser -l ebsi1-robot -c "AWS_REPO=intebsi/trusted-issuers-registry bash /opt/ebsi_containers_int/auto-deploy/minor_version.sh"', returnStdout: true).trim()
    }
    stages {
        stage('Clone repo') {
            steps {
               checkout scm;
            }
        }
//         stage('Unit test') {
//             steps {
//                 sh "npm install"
//                 sh "cp .env.dist .env && npm run test:cov"
//             }
//         }
//         stage('SonarQube Analysis') {
//             steps {
//
//                 sh "/var/lib/jenkins/tools/hudson.plugins.sonar.SonarRunnerInstallation/sonar-scanner/bin/sonar-scanner -Dsonar.host.url=https://infra.ebsi.xyz/sonar -Dsonar.projectName=4-besu-trusted-issuers-api -Dsonar.projectVersion=1.0 -Dsonar.projectKey=4-besu-trusted-issuers-api -Dproject.settings=./sonar-project.properties -Dsonar.sources=. -Dsonar.projectBaseDir=/var/lib/jenkins/workspace/Autodeploy_intebsi-trusted-issuers-registry-api"
//             }
//         }
        stage('Build image') {
            steps {
                sh "rm -rf .env"
                sh "sudo VERSION=${VERSION}_${GIT_COMMIT} AWS_REPO=intebsi/trusted-issuers-registry bash /opt/ebsi_containers_int/auto-deploy/build.sh"
            }
        }
        stage('Push to ECR') {
            steps {
                 sh "sudo `sudo su - ebsi1-robot -c 'aws ecr get-login --no-include-email --region eu-central-1'`"
                 sh "sudo docker push 305472350643.dkr.ecr.eu-central-1.amazonaws.com/intebsi/trusted-issuers-registry"
             }
        }
        stage("Deploy on first machine") {
            steps {
                withCredentials([sshUserPrivateKey(credentialsId: 'ebsi1-robot', keyFileVariable: 'PK')]) {
                       sh "ssh -i $PK ebsi1-operator@app01-0-ebsi-int-lux.intebsi.xyz -o StrictHostKeyChecking=no -o 'UserKnownHostsFile /dev/null' -p 48722 'aws ecr get-login --no-include-email --region eu-central-1 | bash && cd /opt/ebsi/trusted-issuers-registry && docker-compose pull && docker-compose up -d'"
                       sh "ssh -i $PK ebsi1-operator@app02-0-ebsi-int-lux.intebsi.xyz -o StrictHostKeyChecking=no -o 'UserKnownHostsFile /dev/null' -p 48722 'aws ecr get-login --no-include-email --region eu-central-1 | bash && cd /opt/ebsi/trusted-issuers-registry && docker-compose pull && docker-compose up -d'"
                    }
                }
        }
    }
}
