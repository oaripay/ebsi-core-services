pipeline {
    agent any
    stages {
        stage('Setup') {
            steps {
               sh 'yarn install --frozen-lockfile'
               sh "yarn build"
               sh "yarn lint"
            }
        }
        stage('Test') {
            steps {
                sh 'yarn run test'
            }
        }
    }
}