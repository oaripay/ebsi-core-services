def getEnvFromBranch(branch) {
    if (branch == 'dev') {
        return 'development'
    } else {
        return 'integration'
    }
}
def getMcoTarget(branch) {
    if (branch == 'dev') {
        return 'dev'
    } else {
        return 'int'
    }
}
pipeline {
    agent any
    environment {
        EBSI_ENV = getEnvFromBranch(env.BRANCH_NAME)
        MCO_TARGET = getMcoTarget(env.BRANCH_NAME)
        CONTAINER_NAME = "`grep -A1 services .ci/${EBSI_ENV}/docker-compose.yml | tail -1 | sed -e s'/ //'g -e s'/://'g`"
        TAG = "`grep image .ci/${EBSI_ENV}/docker-compose.yml | cut -d':' -f3`"
    }
    stages {
        stage('Lint and unit test') {
            environment {
              // Add tests specific variables here
              API_PRIVATE_KEY = credentials('APP_PRIVATE_KEY_NOTIFICATIONS_API')
            }
            steps {
                sh "yarn install --frozen-lockfile"
                sh "yarn lint"
                sh "yarn test:ci"
            }
        }
        stage('Pre Checks') {
            steps {
                sh "/usr/local/bin/auto_container_validate.sh ${CONTAINER_NAME} ${MCO_TARGET} app lux"
            }
        }
        stage('Build image') {
            steps {
                sh "cd .ci/${EBSI_ENV}; /usr/local/bin/docker-compose build"
            }
        }
        stage('Push to ECR') {
            steps {
                sh '`/usr/local/bin/aws ecr get-login --no-include-email --region eu-central-1`'
                sh "cd .ci/${EBSI_ENV}; /usr/local/bin/docker-compose push"
            }
        }
        stage('Modify YAML & Commit') {
            steps {
                sh "sudo su - ebsi1-robot -c 'cd /etc/puppetlabs/code/environments/${EBSI_ENV} ; git pull'"
                sh "sudo -u ebsi1-robot /usr/local/bin/ebsi_add_update_service_version_tag.rb ${EBSI_ENV} ${MCO_TARGET}/lux/app.yaml ${CONTAINER_NAME} ${TAG}"
                sh "sudo su - ebsi1-robot -c 'cd /etc/puppetlabs/code/environments/${EBSI_ENV} ; git add .; git commit -am auto; git push'"
            }
        }
        stage("Deploy on network") {
            steps {
                withCredentials([sshUserPrivateKey(credentialsId: 'ebsi1-robot', keyFileVariable: 'PK')]) {
                    sh "ssh -i $PK ebsi1-operator@mco01-0-ebsi-dev-lux.ebsi.xyz -o StrictHostKeyChecking=no -o 'UserKnownHostsFile /dev/null' -p 48722 '/usr/local/bin/puppet_run_containers_only.sh ${MCO_TARGET} app lux'"
                    sh "ssh -i $PK ebsi1-operator@mco01-0-ebsi-dev-lux.ebsi.xyz -o StrictHostKeyChecking=no -o 'UserKnownHostsFile /dev/null' -p 48722 /usr/local/bin/verify_container_version.sh ${MCO_TARGET} app lux ${CONTAINER_NAME} ${TAG}"
                }
            }
        }
    }
}
