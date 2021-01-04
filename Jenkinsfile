pipeline {
    agent any
    stages {
         stage('Node Agent') {
            agent {
                docker {
                    image 'node:14.15.1'
                    args '-u root:sudo'
                    reuseNode true
                }
            }
            stages {
                stage('Setup') {
                    steps {
                        sh 'yarn install --frozen-lockfile'
                    }
                }
                stage('Lint') {
                    steps {
                        sh 'yarn lint'
                    }
                }
                stage('Unit tests') {
                    steps {
                        sh 'yarn test'
                    }
                }
            }
        }
    }
}
