node {
    stage('Clone repo') {
        checkout scm
    }
    stage('Unit test') {
        environment {
                APPLICATION_ID=0x0000000000000000000000000000000000000000000000000000000000000000
        }
        withCredentials([string(credentialsId: 'API_PRIVATE_KEY', variable: 'API_PRIVATE_KEY')]) {
            nodejs(nodeJSInstallationName: '14.15.4') {
                sh 'yarn install --frozen-lockfile'
                sh 'yarn run audit'
                sh 'yarn lint'
                sh 'yarn test:ci'
            }
        }
    }
    ebsi_deploy("clone_repo": false)
}
