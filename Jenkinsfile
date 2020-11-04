pipeline {
    agent any
    stages {
        stage('Setup') {
            steps {
               sh 'yarn install --frozen-lockfile'
            }
        }
        stage('Test') {
            steps {
                sh 'yarn run test'
            }
        }
    }
}